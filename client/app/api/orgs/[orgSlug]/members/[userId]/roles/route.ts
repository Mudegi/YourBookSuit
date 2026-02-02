import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from '@/lib/api-auth';
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest, { params }: { params: { orgSlug: string; userId: string } }) {
  try {
    const res = await requirePermission(
      request,
      { orgSlug: params.orgSlug },
      PermissionSections.GENERAL_LEDGER,
      PermissionActions.EDIT
    );
    if (!res.ok) return res.response;
    const { organizationId, userId } = res;

    const body = await request.json();
    const roleIds: string[] = body.roleIds || [];
    if (!Array.isArray(roleIds)) {
      return NextResponse.json({ error: "roleIds must be an array" }, { status: 400 });
    }

    const orgUser = await prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId: params.userId } },
      select: { id: true },
    });
    if (!orgUser) return NextResponse.json({ error: "Organization membership not found" }, { status: 404 });

    const roles = await (prisma as any).role.findMany({ where: { id: { in: roleIds }, organizationId }, select: { id: true } });
    const validRoleIds = (roles as Array<{ id: string }>).map((r) => r.id);

    await prisma.$transaction([
      (prisma as any).organizationUserRole.deleteMany({ where: { orgUserId: orgUser.id } }),
      (prisma as any).organizationUserRole.createMany({
        data: validRoleIds.map((rid) => ({ organizationId, orgUserId: orgUser.id, roleId: rid })),
        skipDuplicates: true,
      }),
    ]);

    await logAudit({
      organizationId,
      userId,
      entityType: "OrganizationUser",
      entityId: orgUser.id,
      action: "UPDATE" as any,
      changes: { assignedRoleIds: validRoleIds },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error assigning roles:", error);
    return NextResponse.json({ error: "Failed to assign roles" }, { status: 500 });
  }
}
