import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from '@/lib/api-auth';
import { DiscountType } from "@prisma/client";

function parseBody(body: any) {
  if (!body) return {};
  const dto: any = {};
  if (body.code !== undefined) dto.code = String(body.code).trim();
  if (body.name !== undefined) dto.name = String(body.name).trim();
  if (body.description !== undefined) dto.description = body.description ? String(body.description).trim() : null;
  if (body.discountType !== undefined) {
    if (!Object.values(DiscountType).includes(body.discountType)) throw new Error("discountType must be PERCENTAGE or FIXED_AMOUNT");
    dto.discountType = body.discountType as DiscountType;
  }
  if (body.value !== undefined) dto.value = Number(body.value);
  if (body.minPurchase !== undefined) dto.minPurchase = body.minPurchase === null ? null : Number(body.minPurchase);
  if (body.maxDiscount !== undefined) dto.maxDiscount = body.maxDiscount === null ? null : Number(body.maxDiscount);
  if (body.validFrom !== undefined) {
    const d = new Date(body.validFrom);
    if (Number.isNaN(d.getTime())) throw new Error("validFrom must be a valid date");
    dto.validFrom = d;
  }
  if (body.validTo !== undefined) {
    const d = new Date(body.validTo);
    if (Number.isNaN(d.getTime())) throw new Error("validTo must be a valid date");
    dto.validTo = d;
  }
  if (body.usageLimit !== undefined) dto.usageLimit = body.usageLimit === null ? null : Number(body.usageLimit);
  if (body.isActive !== undefined) dto.isActive = Boolean(body.isActive);
  return dto;
}

export async function PUT(request: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const res = await requirePermission(request, { orgSlug: params.orgSlug }, PermissionSections.CUSTOMERS, PermissionActions.EDIT);
    if (!res.ok) return res.response;
    const { organizationId } = res;

    const body = await request.json();
    const dto = parseBody(body);

    const existing = await prisma.discount.findFirst({ where: { id: params.id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Discount not found" }, { status: 404 });

    const updated = await prisma.discount.update({ where: { id: existing.id }, data: dto });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating discount:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update discount" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { orgSlug: string; id: string } }) {
  try {
    const res = await requirePermission(request, { orgSlug: params.orgSlug }, PermissionSections.CUSTOMERS, PermissionActions.DELETE);
    if (!res.ok) return res.response;
    const { organizationId } = res;

    const existing = await prisma.discount.findFirst({ where: { id: params.id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Discount not found" }, { status: 404 });

    await prisma.discount.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting discount:", error);
    return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
  }
}
