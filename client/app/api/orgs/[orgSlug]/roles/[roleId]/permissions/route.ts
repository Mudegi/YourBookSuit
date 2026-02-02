import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from '@/lib/api-auth';
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest, { params }: { params: { orgSlug: string; roleId: string } }) {
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
    const permissions: Array<{ section: string; action: string }> = body.permissions || [];
    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: "permissions must be an array" }, { status: 400 });
    }

    const role = await (prisma as any).role.findFirst({ where: { id: params.roleId, organizationId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    // Replace existing permissions with provided set
    await prisma.$transaction([
      (prisma as any).rolePermission.deleteMany({ where: { roleId: role.id } }),
      (prisma as any).rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, section: p.section, action: p.action })),
        skipDuplicates: true,
      }),
    ]);

    await logAudit({
      organizationId,
      userId,
      entityType: "Role",
      entityId: role.id,
      action: "UPDATE" as any,
      changes: { permissions },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating role permissions:", error);
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }
}
