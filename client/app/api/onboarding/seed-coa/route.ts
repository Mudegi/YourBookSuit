import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PaymentTermsService } from '@/services/payment-terms.service';

// Default Chart of Accounts templates by industry
const getIndustryAccounts = (industry: string) => {
  const baseAccounts = [
    // Assets (1000-1999)
    { code: '1000', name: 'Cash and Cash Equivalents', type: 'ASSET', category: 'Current Assets' },
    { code: '1010', name: 'Petty Cash', type: 'ASSET', category: 'Current Assets' },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET', category: 'Current Assets' },
    { code: '1200', name: 'Inventory', type: 'ASSET', category: 'Current Assets' },
    { code: '1500', name: 'Equipment', type: 'ASSET', category: 'Fixed Assets' },
    { code: '1510', name: 'Accumulated Depreciation - Equipment', type: 'ASSET', category: 'Fixed Assets' },
    { code: '1600', name: 'Furniture and Fixtures', type: 'ASSET', category: 'Fixed Assets' },
    
    // Liabilities (2000-2999)
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', category: 'Current Liabilities' },
    { code: '2100', name: 'Sales Tax Payable', type: 'LIABILITY', category: 'Current Liabilities' },
    { code: '2200', name: 'Accrued Expenses', type: 'LIABILITY', category: 'Current Liabilities' },
    { code: '2300', name: 'Short-term Loans', type: 'LIABILITY', category: 'Current Liabilities' },
    { code: '2500', name: 'Long-term Loans', type: 'LIABILITY', category: 'Long-term Liabilities' },
    
    // Equity (3000-3999)
    { code: '3000', name: 'Owner\'s Capital', type: 'EQUITY', category: 'Equity' },
    { code: '3100', name: 'Retained Earnings', type: 'EQUITY', category: 'Equity' },
    { code: '3200', name: 'Drawings', type: 'EQUITY', category: 'Equity' },
    
    // Revenue (4000-4999)
    { code: '4000', name: 'Sales Revenue', type: 'REVENUE', category: 'Operating Revenue' },
    { code: '4100', name: 'Service Revenue', type: 'REVENUE', category: 'Operating Revenue' },
    { code: '4900', name: 'Other Income', type: 'REVENUE', category: 'Other Revenue' },
    
    // Expenses (5000-9999)
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', category: 'Cost of Sales' },
    { code: '6000', name: 'Salaries and Wages', type: 'EXPENSE', category: 'Operating Expenses' },
    { code: '6100', name: 'Rent Expense', type: 'EXPENSE', category: 'Operating Expenses' },
    { code: '6200', name: 'Utilities', type: 'EXPENSE', category: 'Operating Expenses' },
    { code: '6300', name: 'Insurance', type: 'EXPENSE', category: 'Operating Expenses' },
    { code: '6400', name: 'Office Supplies', type: 'EXPENSE', category: 'Operating Expenses' },
    { code: '6500', name: 'Marketing and Advertising', type: 'EXPENSE', category: 'Operating Expenses' },
    { code: '6600', name: 'Travel and Entertainment', type: 'EXPENSE', category: 'Operating Expenses' },
    { code: '6700', name: 'Professional Fees', type: 'EXPENSE', category: 'Operating Expenses' },
    { code: '7000', name: 'Interest Expense', type: 'EXPENSE', category: 'Financial Expenses' },
    { code: '7100', name: 'Bank Charges', type: 'EXPENSE', category: 'Financial Expenses' },
    { code: '8000', name: 'Depreciation Expense', type: 'EXPENSE', category: 'Non-Operating Expenses' },
  ];

  // Industry-specific accounts
  const industrySpecific: Record<string, any[]> = {
    retail: [
      { code: '1150', name: 'Merchandise Inventory', type: 'ASSET', category: 'Current Assets' },
      { code: '4010', name: 'Retail Sales', type: 'REVENUE', category: 'Operating Revenue' },
      { code: '5010', name: 'Purchase Returns', type: 'EXPENSE', category: 'Cost of Sales' },
    ],
    manufacturing: [
      { code: '1210', name: 'Raw Materials', type: 'ASSET', category: 'Current Assets' },
      { code: '1220', name: 'Work in Progress', type: 'ASSET', category: 'Current Assets' },
      { code: '1230', name: 'Finished Goods', type: 'ASSET', category: 'Current Assets' },
      { code: '1700', name: 'Manufacturing Equipment', type: 'ASSET', category: 'Fixed Assets' },
      { code: '5100', name: 'Direct Labor', type: 'EXPENSE', category: 'Manufacturing Costs' },
      { code: '5200', name: 'Manufacturing Overhead', type: 'EXPENSE', category: 'Manufacturing Costs' },
    ],
    services: [
      { code: '1300', name: 'Unbilled Revenue', type: 'ASSET', category: 'Current Assets' },
      { code: '2400', name: 'Deferred Revenue', type: 'LIABILITY', category: 'Current Liabilities' },
      { code: '4200', name: 'Consulting Revenue', type: 'REVENUE', category: 'Operating Revenue' },
    ],
    hospitality: [
      { code: '4020', name: 'Room Revenue', type: 'REVENUE', category: 'Operating Revenue' },
      { code: '4030', name: 'Food & Beverage Revenue', type: 'REVENUE', category: 'Operating Revenue' },
      { code: '5020', name: 'Food Costs', type: 'EXPENSE', category: 'Cost of Sales' },
      { code: '5030', name: 'Beverage Costs', type: 'EXPENSE', category: 'Cost of Sales' },
    ],
    healthcare: [
      { code: '4300', name: 'Patient Services Revenue', type: 'REVENUE', category: 'Operating Revenue' },
      { code: '6800', name: 'Medical Supplies', type: 'EXPENSE', category: 'Operating Expenses' },
      { code: '6810', name: 'Pharmaceuticals', type: 'EXPENSE', category: 'Operating Expenses' },
    ],
    construction: [
      { code: '1400', name: 'Construction in Progress', type: 'ASSET', category: 'Current Assets' },
      { code: '4400', name: 'Contract Revenue', type: 'REVENUE', category: 'Operating Revenue' },
      { code: '5300', name: 'Subcontractor Costs', type: 'EXPENSE', category: 'Project Costs' },
      { code: '5310', name: 'Material Costs', type: 'EXPENSE', category: 'Project Costs' },
    ],
    technology: [
      { code: '4500', name: 'Software License Revenue', type: 'REVENUE', category: 'Operating Revenue' },
      { code: '4510', name: 'Subscription Revenue', type: 'REVENUE', category: 'Operating Revenue' },
      { code: '6900', name: 'Research and Development', type: 'EXPENSE', category: 'Operating Expenses' },
      { code: '6910', name: 'Software Development', type: 'EXPENSE', category: 'Operating Expenses' },
    ],
    education: [
      { code: '4600', name: 'Tuition Revenue', type: 'REVENUE', category: 'Operating Revenue' },
      { code: '4610', name: 'Course Fees', type: 'REVENUE', category: 'Operating Revenue' },
      { code: '6920', name: 'Educational Materials', type: 'EXPENSE', category: 'Operating Expenses' },
    ],
    nonprofit: [
      { code: '4700', name: 'Donations Revenue', type: 'REVENUE', category: 'Contributions' },
      { code: '4710', name: 'Grant Revenue', type: 'REVENUE', category: 'Contributions' },
      { code: '4720', name: 'Fundraising Revenue', type: 'REVENUE', category: 'Contributions' },
      { code: '6930', name: 'Program Expenses', type: 'EXPENSE', category: 'Program Costs' },
    ],
  };

  return [...baseAccounts, ...(industrySpecific[industry] || [])];
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const body = await request.json();
    const { industry } = body;

    if (!industry) {
      return NextResponse.json(
        { error: 'Industry is required' },
        { status: 400 }
      );
    }

    // Get user's organization
    const userOrg = await prisma.organizationUser.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organizationId = userOrg.organizationId;

    // Update organization with industry
    await prisma.organization.update({
      where: { id: organizationId },
      data: { industry },
    });

    // Get accounts template for this industry
    const accounts = getIndustryAccounts(industry);

    // Check if Chart of Accounts already exists
    const existingAccounts = await prisma.chartOfAccount.count({
      where: { organizationId },
    });

    if (existingAccounts > 0) {
      return NextResponse.json({
        success: true,
        message: 'Chart of Accounts already exists',
        accountsCreated: existingAccounts,
      });
    }

    // Create Chart of Accounts
    const createdAccounts = await prisma.$transaction(
      accounts.map((account) =>
        prisma.chartOfAccount.create({
          data: {
            organizationId,
            code: account.code,
            name: account.name,
            accountType: account.type,
            accountSubType: account.category,
            isActive: true,
          },
        })
      )
    );

    // Seed default payment terms for the organization
    try {
      await PaymentTermsService.seedDefaults(organizationId);
      console.log('✅ Default payment terms seeded successfully');
    } catch (seedError) {
      // Log but don't fail the onboarding if payment terms fail
      console.error('⚠️ Failed to seed payment terms:', seedError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdAccounts.length} accounts for ${industry} industry`,
      accountsCreated: createdAccounts.length,
    });
  } catch (error: any) {
    console.error('Chart of Accounts seeding error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
