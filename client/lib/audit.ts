import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";

export async function logAudit(opts: {
  organizationId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: opts.organizationId,
        userId: opts.userId,
        entityType: opts.entityType,
        entityId: opts.entityId,
        action: opts.action,
        changes: opts.changes ? (opts.changes as any) : undefined,
        ipAddress: opts.ipAddress || undefined,
        userAgent: opts.userAgent || undefined,
      },
    });
  } catch (e) {
    // Swallow audit errors to not break business flow
    console.error("Failed to write audit log", e);
  }
}
