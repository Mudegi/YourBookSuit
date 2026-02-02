import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from '@/lib/api-auth';
import { DiscountType } from "@prisma/client";

function parseBody(body: any) {
  const required = ["code", "name", "discountType", "value", "validFrom", "validTo"];
  for (const key of required) {
    if (body?.[key] === undefined || body?.[key] === null || body?.[key] === "") {
      throw new Error(`${key} is required`);
    }
  }
  if (!Object.values(DiscountType).includes(body.discountType)) {
    throw new Error("discountType must be PERCENTAGE or FIXED_AMOUNT");
  }
  const validFrom = new Date(body.validFrom);
  const validTo = new Date(body.validTo);
  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validTo.getTime())) {
    throw new Error("validFrom and validTo must be valid dates");
  }
  return {
    code: String(body.code).trim(),
    name: String(body.name).trim(),
    description: body.description ? String(body.description).trim() : null,
    discountType: body.discountType as DiscountType,
    value: Number(body.value),
    minPurchase: body.minPurchase ? Number(body.minPurchase) : null,
    maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : null,
    validFrom,
    validTo,
    usageLimit: body.usageLimit ? Number(body.usageLimit) : null,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
  };
}

export async function GET(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const res = await requirePermission(request, { orgSlug: params.orgSlug }, PermissionSections.CUSTOMERS, PermissionActions.VIEW);
    if (!res.ok) return res.response;
    const { organizationId } = res;

    const discounts = await prisma.discount.findMany({
      where: { organizationId },
      orderBy: { validFrom: "desc" },
    });

    return NextResponse.json({ success: true, data: discounts });
  } catch (error) {
    console.error("Error fetching discounts:", error);
    return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const res = await requirePermission(request, { orgSlug: params.orgSlug }, PermissionSections.CUSTOMERS, PermissionActions.EDIT);
    if (!res.ok) return res.response;
    const { organizationId, userId } = res;

    const body = await request.json();
    const dto = parseBody(body);

    const discount = await prisma.discount.create({
      data: {
        ...dto,
        organizationId,
      },
    });

    return NextResponse.json({ success: true, data: discount });
  } catch (error) {
    console.error("Error creating discount:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create discount" }, { status: 400 });
  }
}
