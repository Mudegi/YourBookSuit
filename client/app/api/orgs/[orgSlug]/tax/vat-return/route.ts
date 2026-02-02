import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { TaxReturnService } from '@/services/tax/tax-return.service';
import { LocalizationManager } from '@/services/tax/localization-manager';

/**
 * GET /api/orgs/[orgSlug]/tax/vat-return
 * Generate VAT return for a period
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }
) {
  try {
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const orgSlug = resolvedParams.orgSlug;
    const { userId, organizationId } = await requireAuth(orgSlug);

    const { searchParams } = new URL(request.url);
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');
    const basis = (searchParams.get('basis') || 'ACCRUAL') as 'ACCRUAL' | 'CASH';
    const countryCode = searchParams.get('countryCode') || 'UG';

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'periodStart and periodEnd are required' },
        { status: 400 }
      );
    }

    // Generate tax return
    const taxReturn = await TaxReturnService.generateTaxReturn(
      organizationId,
      new Date(periodStart),
      new Date(periodEnd),
      basis
    );

    // Get localization template
    const template = LocalizationManager.getTaxReturnTemplate(countryCode);

    // Validate against country rules
    const validation = LocalizationManager.validateTaxReturn(countryCode, taxReturn);

    // Transform to serializable format
    const response = {
      ...taxReturn,
      boxes: {
        box1_standardRatedSales: {
          revenue: taxReturn.boxes.box1_standardRatedSales.revenue.toNumber(),
          outputVAT: taxReturn.boxes.box1_standardRatedSales.outputVAT.toNumber(),
          transactionCount: taxReturn.boxes.box1_standardRatedSales.transactionCount,
        },
        box2_zeroRatedExemptSales: {
          revenue: taxReturn.boxes.box2_zeroRatedExemptSales.revenue.toNumber(),
          transactionCount: taxReturn.boxes.box2_zeroRatedExemptSales.transactionCount,
        },
        box3_inputTax: {
          purchases: taxReturn.boxes.box3_inputTax.purchases.toNumber(),
          inputVAT: taxReturn.boxes.box3_inputTax.inputVAT.toNumber(),
          transactionCount: taxReturn.boxes.box3_inputTax.transactionCount,
        },
        box4_netTaxPayable: taxReturn.boxes.box4_netTaxPayable.toNumber(),
      },
      breakdown: {
        byTaxRate: taxReturn.breakdown.byTaxRate.map((item: any) => ({
          ...item,
          revenue: item.revenue.toNumber(),
          taxAmount: item.taxAmount.toNumber(),
        })),
        byAccount: taxReturn.breakdown.byAccount,
      },
      template,
      validation,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error generating VAT return:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate VAT return' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/tax/vat-return/lock
 * Lock a tax period
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }
) {
  try {
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const orgSlug = resolvedParams.orgSlug;
    const { userId, organizationId } = await requireAuth(orgSlug);

    const body = await request.json();
    const { periodStart, periodEnd, action } = body;

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'periodStart and periodEnd are required' },
        { status: 400 }
      );
    }

    if (action === 'lock') {
      await TaxReturnService.lockPeriod(
        organizationId,
        new Date(periodStart),
        new Date(periodEnd),
        userId
      );
      return NextResponse.json({ success: true, message: 'Period locked successfully' });
    } else if (action === 'unlock') {
      await TaxReturnService.unlockPeriod(
        organizationId,
        new Date(periodStart),
        new Date(periodEnd)
      );
      return NextResponse.json({ success: true, message: 'Period unlocked successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error locking/unlocking period:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to lock/unlock period' },
      { status: 500 }
    );
  }
}
