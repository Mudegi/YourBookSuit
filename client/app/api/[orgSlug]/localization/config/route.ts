import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { Permission } from '@/lib/permissions';

const localizationSchema = z.object({
  country: z.string().min(2),
  language: z.string().default('en'),
  dateFormat: z.string().default('MM/DD/YYYY'),
  timeFormat: z.string().default('12h'),
  numberFormat: z.string().default('1,234.56'),
  currencyFormat: z.string().default('$1,234.56'),
  firstDayOfWeek: z.number().int().min(0).max(6).default(0),
  fiscalYearStart: z.number().int().min(1).max(12).default(1),
  taxIdLabel: z.string().optional(),
  addressFormat: z.any().optional(),
  reportingRequirements: z.any().optional(),
  // Enhanced localization metadata fields
  apiEndpoints: z.any().optional(),
  taxReturnTemplates: z.any().optional(),
  digitalFiscalization: z.any().optional(),
  translationKeys: z.any().optional(),
  complianceDrivers: z.any().optional(),
  fiscalCalendar: z.any().optional(),
  regulatoryBodies: z.any().optional(),
});

// GET /api/[orgSlug]/localization/config
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requirePermission(
      params.orgSlug,
      Permission.VIEW_LOCALIZATION
    );

    const config = await prisma.localizationConfig.findUnique({
      where: { organizationId },
    });

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch localization config' },
      { status: error.status || 500 }
    );
  }
}

// PUT /api/[orgSlug]/localization/config
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requirePermission(
      params.orgSlug,
      Permission.MANAGE_LOCALIZATION
    );

    const body = await request.json();
    const data = localizationSchema.parse(body);

    const saved = await prisma.localizationConfig.upsert({
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
      { success: false, error: error.message || 'Failed to save localization config' },
      { status: error.status || 500 }
    );
  }
}
