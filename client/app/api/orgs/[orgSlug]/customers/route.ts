import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { customerSchema } from '@/lib/validation';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';
import { EntryType } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';

const buildCustomerName = (customer: { firstName?: string | null; lastName?: string | null; companyName?: string | null }) => {
  const personalName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return (customer.companyName || personalName || '').trim();
};

const generateCustomerNumber = async (organizationId: string) => {
  const lastCustomer = await prisma.customer.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    select: { customerNumber: true },
  });

  const lastNumber = lastCustomer?.customerNumber?.match(/(\d+)$/)?.[1];
  const next = (lastNumber ? parseInt(lastNumber, 10) + 1 : 1).toString().padStart(4, '0');
  return `CUST-${next}`;
};

const validateTaxCategoryForRegion = (region: string | undefined, taxCategory: string | undefined): string | null => {
  // Only validate if both region and taxCategory are explicitly provided
  // This is just a warning, not a blocker
  if (!region || !taxCategory) return null;
  
  // For now, we're not blocking any combinations - just storing them for reference
  // Users can configure their own tax rules per region
  return null;
};

const createOpeningBalanceEntry = async (
  customerId: string,
  customerName: string,
  organizationId: string,
  userId: string,
  openingBalance: number
) => {
  // Find Accounts Receivable account
  const arAccount = await prisma.chartOfAccount.findFirst({
    where: {
      organizationId,
      code: { startsWith: '1200' },
      accountType: 'ASSET',
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  if (!arAccount) {
    throw new Error('Accounts Receivable account not found');
  }

  // Find Opening Balance Equity account (typically 3900 range)
  let obAccount = await prisma.chartOfAccount.findFirst({
    where: {
      organizationId,
      OR: [
        { code: '3900' },
        { code: { startsWith: '390' } },
        { name: { contains: 'Opening Balance', mode: 'insensitive' } },
      ],
      isActive: true,
    },
  });

  // Create Opening Balance Equity account if it doesn't exist
  if (!obAccount) {
    obAccount = await prisma.chartOfAccount.create({
      data: {
        organizationId,
        code: '3900',
        name: 'Opening Balance Equity',
        accountType: 'EQUITY',
        accountSubType: 'Equity',
        description: 'Temporary account for migration balances',
        isSystem: false,
        isActive: true,
      },
    });
  }

  // Create migration journal entry
  const transaction = await DoubleEntryService.createTransaction({
    organizationId,
    transactionDate: new Date(),
    transactionType: 'JOURNAL_ENTRY',
    description: `Opening Balance - Customer Migration: ${customerName}`,
    notes: `Initial balance for customer ${customerName}`,
    referenceType: 'CUSTOMER_OPENING_BALANCE',
    referenceId: customerId,
    createdById: userId,
    entries: [
      {
        accountId: arAccount.id,
        entryType: EntryType.DEBIT,
        amount: new Decimal(openingBalance),
        description: `Opening balance for ${customerName}`,
      },
      {
        accountId: obAccount.id,
        entryType: EntryType.CREDIT,
        amount: new Decimal(openingBalance),
        description: `Opening balance for ${customerName}`,
      },
    ],
  });

  // Post the transaction
  await DoubleEntryService.postTransaction(transaction.id);

  return transaction;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    let organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
      if (!org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
      organizationId = org.id;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {
      organizationId,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Fetch customers with invoice count and total owed
    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: [
        { companyName: 'asc' },
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });

    // Calculate total owed for each customer
    const customersWithOwed = customers.map((customer) => ({
      ...customer,
      name: buildCustomerName(customer),
      totalOwed: 0,
    }));

    return NextResponse.json({
      success: true,
      data: customersWithOwed,
      customers: customersWithOwed,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify organization membership
    const { org } = await requireOrgMembership(user.id, params.orgSlug);
    const organizationId = org.id;
    const userId = user.id;

    const body = await request.json();

    // Validate input
    const validation = customerSchema.safeParse(body);
    if (!validation.success) {
      console.error('Validation errors:', validation.error.errors);
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validation.error.errors,
          message: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const customerNumber = await generateCustomerNumber(organizationId);

    // Validate tax category for region
    const taxValidationError = validateTaxCategoryForRegion(data.region, data.taxCategory);
    if (taxValidationError) {
      return NextResponse.json(
        { error: taxValidationError },
        { status: 400 }
      );
    }

    // Validate default revenue account if provided
    if (data.defaultRevenueAccountId) {
      const revenueAccount = await prisma.chartOfAccount.findFirst({
        where: {
          id: data.defaultRevenueAccountId,
          organizationId,
          accountType: 'REVENUE',
          isActive: true,
        },
      });

      if (!revenueAccount) {
        return NextResponse.json(
          { error: 'Invalid revenue account selected' },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    if (data.email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          organizationId,
          email: data.email,
        },
      });

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Customer with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Create customer with financial initialization
    const customer = await prisma.customer.create({
      data: {
        organization: { connect: { id: organizationId } },
        customerNumber,
        companyName: data.companyName || null,
        firstName: data.firstName,
        lastName: data.lastName,
        // Use empty string fallback to satisfy older Prisma client type expecting non-null
        email: data.email && data.email.length > 0 ? data.email : '',
        phone: data.phone || null,
        website: data.website || null,
        taxIdNumber: data.taxIdNumber || null,
        billingAddress: data.billingAddress ?? undefined,
        shippingAddress: data.shippingAddress ?? undefined,
        notes: data.notes || null,
        creditLimit: data.creditLimit ?? undefined,
        paymentTerms: data.paymentTerms ?? 30,
        isActive: data.isActive ?? true,
      } as any,
    });

    const customerName = buildCustomerName(customer);

    // Create opening balance journal entry if provided
    let openingBalanceTransaction = null;
    let obWarning = null;
    if (data.openingBalance && data.openingBalance > 0) {
      try {
        openingBalanceTransaction = await createOpeningBalanceEntry(
          customer.id,
          customerName,
          organizationId,
          userId,
          data.openingBalance
        );
      } catch (obError) {
        console.error('Error creating opening balance:', obError);
        // Don't fail customer creation if opening balance fails
        obWarning = obError instanceof Error ? obError.message : 'Could not create opening balance entry';
      }
    }

    const response: any = {
      success: true,
      data: {
        ...customer,
        name: customerName,
        openingBalanceTransactionId: openingBalanceTransaction?.id,
      },
    };

    if (obWarning) {
      response.warning = obWarning;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
