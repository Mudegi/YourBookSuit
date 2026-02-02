import { createRecurringWorker, shutdownBullmq } from '@/lib/bullmq';
import { executeTemplate } from '@/lib/recurring';
import { prisma } from '@/lib/prisma';

const worker = createRecurringWorker(async (job) => {
  const { orgId, templateId } = job.data;
  await executeTemplate({ orgId, templateId });
});

worker.on('completed', (job) => {
  console.log(`[RecurringWorker] Completed job ${job.id} for template ${job.data.templateId}`);
});

worker.on('failed', (job, err) => {
  console.error(`[RecurringWorker] Failed job ${job?.id}`, err);
});

process.on('SIGINT', async () => {
  console.log('\n[RecurringWorker] Shutting down...');
  await worker.close();
  await shutdownBullmq();
  await prisma.$disconnect();
  process.exit(0);
});
