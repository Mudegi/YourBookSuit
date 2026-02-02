import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/orgs/[orgSlug]/users
 * List organization members with user details
 */
export async function GET(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    let organizationId = request.headers.get("x-organization-id");
    if (!organizationId) {
      const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
      if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      organizationId = org.id;
    }

    const memberships = await prisma.organizationUser.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, lastLoginAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const data = memberships.map((m) => ({
      user: m.user,
      role: m.role,
      createdAt: m.createdAt,
      isActive: m.isActive,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching organization users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
