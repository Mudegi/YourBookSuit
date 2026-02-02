import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from '@/lib/api-auth';
import { PermissionSection, PermissionAction } from "@prisma/client";

export async function GET(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const { ok, organizationId, response } = await requirePermission(
      request,
      { orgSlug: params.orgSlug },
      PermissionSection.REPORTS,
      PermissionAction.VIEW
    );
    if (!ok) return response;

    const scope = new URL(request.url).searchParams.get("scope") || "sensitive";

    const where = { organizationId } as any;
    if (scope === "sensitive") {
      where.entityType = { in: [
        "Role",
        "OrganizationInvite",
        "TaxConfiguration",
        "ChartOfAccount",
        "Transaction",
        "Invoice",
        "Settings",
      ] };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 200,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
