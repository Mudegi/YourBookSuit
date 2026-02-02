import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { Permission } from '@/lib/permissions';

const einvoiceSchema = z.object({
  country: z.string().min(2),
  provider: z.string().min(2),
  apiEndpoint: z.string().url(),
  credentials: z.any(),
  certificatePath: z.string().optional(),
  isActive: z.boolean().default(true),
});

// GET /api/[orgSlug]/tax/e-invoicing/config
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requirePermission(
      params.orgSlug,
      Permission.CONFIGURE_E_INVOICING
    );

    const config = await prisma.eInvoiceConfig.findUnique({ where: { organizationId } });

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch e-invoicing config' },
      { status: error.status || 500 }
    );
  }
}

// PUT /api/[orgSlug]/tax/e-invoicing/config
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requirePermission(
      params.orgSlug,
      Permission.CONFIGURE_E_INVOICING
    );

    const body = await request.json();
    const data = einvoiceSchema.parse(body);

    const saved = await prisma.eInvoiceConfig.upsert({
      where: { organizationId },
      update: { ...data },
      create: { organizationId, ...data },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save e-invoicing config' },
      { status: error.status || 500 }
    );
  }
}
