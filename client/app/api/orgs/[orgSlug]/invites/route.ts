import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from '@/lib/api-auth';
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

export async function GET(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const res = await requirePermission(
      request,
      { orgSlug: params.orgSlug },
      PermissionSections.GENERAL_LEDGER,
      PermissionActions.VIEW
    );
    if (!res.ok) return res.response;
    const { organizationId } = res;

    const invites = await (prisma as any).organizationInvite.findMany({
      where: { organizationId },
      include: { role: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: invites });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const res2 = await requirePermission(
      request,
      { orgSlug: params.orgSlug },
      PermissionSections.GENERAL_LEDGER,
      PermissionActions.EDIT
    );
    if (!res2.ok) return res2.response;
    const { organizationId, userId } = res2;

    const body = await request.json();
    const email: string = body.email;
    const roleId: string | undefined = body.roleId;
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await (prisma as any).organizationInvite.create({
      data: { organizationId, email, roleId, token, expiresAt, invitedById: userId },
    });

    await logAudit({
      organizationId,
      userId,
      entityType: "OrganizationInvite",
      entityId: invite.id,
      action: "CREATE" as any,
      changes: { email, roleId },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    // In a real system, send email. Here we return the invite link.
    const inviteLink = `${process.env.APP_URL || ""}/invite/${invite.token}`;
    return NextResponse.json({ success: true, data: { invite, inviteLink } });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
