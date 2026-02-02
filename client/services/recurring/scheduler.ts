import { prisma } from '@/lib/prisma';
import { computeNextRunAt } from '@/lib/recurring';
import { getRecurringQueue } from '@/lib/bullmq';
import { enqueueNotification } from '@/lib/notifications';

async function getApproverEmails(orgId: string, roles: string[]) {
  const members = await prisma.organizationUser.findMany({
    where: { organizationId: orgId, role: { in: roles as any } },
    include: { user: true },
  });
  return members.map((m) => m.user.email).filter(Boolean) as string[];
}

// Runs all due templates once. Safe to call repeatedly; uses nextRunAt.
export async function processDueTemplatesOnce() {
  const queue = getRecurringQueue();
  const now = new Date();
  const dueTemplates = await prisma.recurringTemplate.findMany({
    where: {
      status: 'ACTIVE',
      nextRunAt: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    orderBy: { nextRunAt: 'asc' },
  });

  for (const tpl of dueTemplates) {
    try {
      if (tpl.maxExecutions && tpl.executedCount >= tpl.maxExecutions) {
        // Pause when reached max executions
        await prisma.recurringTemplate.update({
          where: { id: tpl.id },
          data: { status: 'PAUSED', notes: 'Auto-paused: maxExecutions reached' },
        });
        continue;
      }

      if (tpl.approvalRequired) {
        // Create a pending execution and advance nextRunAt, do not post yet
        const exec = await prisma.recurringExecution.create({
          data: {
            organizationId: tpl.organizationId,
            templateId: tpl.id,
            runAt: now,
            status: 'PENDING',
            attempt: 1,
            payloadSnapshot: tpl.payload,
            message: 'Awaiting approval before posting',
          },
        });

        const next = computeNextRunAt(tpl);
        await prisma.recurringTemplate.update({
          where: { id: tpl.id },
          data: { nextRunAt: next },
        });

        // Notify template owner for approval
        if (tpl.createdById) {
          const creator = await prisma.user.findUnique({ where: { id: tpl.createdById }, select: { email: true } });
          if (creator?.email) {
            await enqueueNotification({
              type: 'email',
              to: creator.email,
              subject: `Approval needed for recurring template ${tpl.name}`,
              body: `A new execution (${exec.id}) is awaiting approval for template ${tpl.name}.`,
            });
          }
        }

        // Also notify approvers in the organization
        const roles = tpl.approverRoles?.length ? tpl.approverRoles : ['ADMIN', 'MANAGER'];
        const approverEmails = await getApproverEmails(tpl.organizationId, roles);
        await Promise.all(
          approverEmails.map((email) =>
            enqueueNotification({
              type: 'email',
              to: email,
              subject: `Approval needed for ${tpl.name}`,
              body: `Execution ${exec.id} is pending approval for template ${tpl.name}.`,
            })
          )
        );
      } else {
        const next = computeNextRunAt(tpl);
        await queue.add(
          'execute-template',
          { orgId: tpl.organizationId, templateId: tpl.id },
          {
            jobId: `${tpl.id}:${tpl.nextRunAt?.toISOString() ?? now.toISOString()}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: 1000,
            removeOnFail: 500,
          },
        );

        await prisma.recurringTemplate.update({
          where: { id: tpl.id },
          data: { nextRunAt: next },
        });
      }
    } catch (err) {
      const next = computeNextRunAt(tpl);
      await prisma.recurringTemplate.update({
        where: { id: tpl.id },
        data: { nextRunAt: next },
      });
      // Best-effort: log template-level note (avoid spamming audit logs here)
      await prisma.recurringExecution.create({
        data: {
          organizationId: tpl.organizationId,
          templateId: tpl.id,
          runAt: now,
          status: 'FAILED',
          attempt: 1,
          payloadSnapshot: tpl.payload,
          message: 'Scheduler failed to enqueue template',
          errorStack: String((err as any)?.stack || (err as any)?.message || err),
        },
      });
    }
  }
}

let started = false;
let timer: NodeJS.Timer | undefined;

// Simple in-app scheduler using setInterval. Not suitable for serverless.
export function startInAppScheduler(intervalMs = 60_000) {
  if (started) return;
  started = true;
  timer = setInterval(() => {
    processDueTemplatesOnce().catch(() => void 0);
  }, intervalMs);
}

export function stopInAppScheduler() {
  if (timer) clearInterval(timer);
  started = false;
}
