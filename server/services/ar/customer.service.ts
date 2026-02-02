import { prisma } from '@/lib/prisma';
import { LocalizationProvider } from '@/lib/localization/localization-provider';
import type { Customer, Invoice, Payment } from '@prisma/client';
import { Decimal } from 'decimal.js';

/**
 * Customer Master Service - Country-Blind Implementation
 * 
 * This service implements the "Global by Design, Localized by Configuration" pattern.
 * It pulls tax validation, currency handling, and regional business rules from:
 * - OrganizationSettings (baseCurrency, homeCountry)
 * - LocalizationProvider (tax ID formats, regional compliance)
 * 
 * NO hardcoded country logic. All regional behavior is configurable.
 */

export interface CustomerFinancialSummary {
  totalOutstanding: number;
  totalPaid: number;
  totalInvoiced: number;
  creditAvailable: number;
  creditUtilization: number; // Percentage
  agingSummary: AgingSummary;
  isCreditHold: boolean;
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AgingSummary {
  current: number; // 0-30 days
  days31_60: number;
  days61_90: number;
  days90Plus: number;
  buckets: AgingBucket[];
}

export interface AgingBucket {
  label: string;
  daysRange: { min: number; max: number | null };
  amount: number;
  invoiceCount: number;
  percentOfTotal: number;
}

export interface CustomerAddress {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  // Regional fields (e.g., District in Uganda, Prefecture in Japan)
  region?: string;
  district?: string;
  subCounty?: string;
}

export interface CustomerMetadata {
  // Country-specific fields stored in JSONB
  tradeLicenseNumber?: string;
  nationalIdNumber?: string; // NIRA ID in Uganda, SSN in US
  vatRegistrationDate?: string;
  industryCode?: string;
  // Custom fields for vertical industries
  [key: string]: any;
}

export interface CustomerCreditCheck {
  isApproved: boolean;
  creditLimit: number;
  currentBalance: number;
  proposedAmount: number;
  availableCredit: number;
  reason?: string;
  requiresApproval: boolean;
  approvalThreshold?: number;
}

export interface EnhancedCustomer extends Customer {
  financialSummary: CustomerFinancialSummary;
  displayName: string;
  taxIdLabel: string; // e.g., "TIN" for Uganda, "EIN" for US
  addressFormatted: {
    billing: string;
    shipping: string;
  };
  metadata: CustomerMetadata;
  complianceFlags: {
    taxIdValid: boolean;
    creditCheckRequired: boolean;
    documentationComplete: boolean;
    kycVerified: boolean;
  };
}

export class CustomerService {
  private localizationProvider = LocalizationProvider.getInstance();

  /**
   * Get comprehensive customer data with financial summary and aging
   */
  async getCustomerWithFinancials(
    customerId: string,
    organizationId: string
  ): Promise<EnhancedCustomer> {
    // Get organization settings for currency and country context
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        baseCurrency: true,
        homeCountry: true,
        fiscalYearStart: true,
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Fetch customer with all related data
    const customer = await prisma.customer.findUnique({
      where: { id: customerId, organizationId },
      include: {
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            dueDate: true,
            total: true,
            amountPaid: true,
            amountDue: true,
            status: true,
            currency: true,
            exchangeRate: true,
          },
          orderBy: { invoiceDate: 'desc' },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
          },
        },
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate financial summary
    const financialSummary = await this.calculateFinancialSummary(
      customer,
      organization.baseCurrency
    );

    // Get localization context
    const localizationContext = {
      organizationId,
      country: organization.homeCountry,
    };

    // Get tax ID label from localization provider
    const taxIdLabel = await this.localizationProvider.getTaxIdLabel(
      organization.homeCountry
    );

    // Validate tax ID if provided
    const taxIdValid = customer.taxIdNumber
      ? await this.localizationProvider.validateTaxId(
          customer.taxIdNumber,
          organization.homeCountry
        )
      : true; // No tax ID is valid (not all customers need one)

    // Build display name
    const displayName = this.buildDisplayName(customer);

    // Format addresses using regional rules
    const addressFormatted = {
      billing: this.formatAddress(
        customer.billingAddress as CustomerAddress | null,
        organization.homeCountry
      ),
      shipping: this.formatAddress(
        customer.shippingAddress as CustomerAddress | null,
        organization.homeCountry
      ),
    };

    // Parse metadata from JSONB or create empty
    const metadata: CustomerMetadata = (customer.notes as any) || {};

    // Build compliance flags
    const complianceFlags = {
      taxIdValid,
      creditCheckRequired: financialSummary.creditUtilization > 0.8,
      documentationComplete: !!(customer.taxIdNumber && customer.email),
      kycVerified: !!customer.taxIdNumber,
    };

    return {
      ...customer,
      financialSummary,
      displayName,
      taxIdLabel,
      addressFormatted,
      metadata,
      complianceFlags,
    };
  }

  /**
   * Calculate comprehensive financial summary with aging
   */
  async calculateFinancialSummary(
    customer: Customer & { invoices: any[]; payments: any[] },
    baseCurrency: string
  ): Promise<CustomerFinancialSummary> {
    const now = new Date();

    // Calculate totals in base currency
    let totalOutstanding = new Decimal(0);
    let totalPaid = new Decimal(0);
    let totalInvoiced = new Decimal(0);

    // Aging buckets
    const agingBuckets: AgingBucket[] = [
      { label: 'Current (0-30 days)', daysRange: { min: 0, max: 30 }, amount: 0, invoiceCount: 0, percentOfTotal: 0 },
      { label: '31-60 days', daysRange: { min: 31, max: 60 }, amount: 0, invoiceCount: 0, percentOfTotal: 0 },
      { label: '61-90 days', daysRange: { min: 61, max: 90 }, amount: 0, invoiceCount: 0, percentOfTotal: 0 },
      { label: '90+ days', daysRange: { min: 91, max: null }, amount: 0, invoiceCount: 0, percentOfTotal: 0 },
    ];

    // Process invoices
    for (const invoice of customer.invoices) {
      // Convert to base currency if needed
      const exchangeRate = new Decimal(invoice.exchangeRate || 1);
      const total = new Decimal(invoice.total).mul(exchangeRate);
      const paid = new Decimal(invoice.amountPaid).mul(exchangeRate);
      const due = new Decimal(invoice.amountDue).mul(exchangeRate);

      totalInvoiced = totalInvoiced.add(total);
      totalPaid = totalPaid.add(paid);
      totalOutstanding = totalOutstanding.add(due);

      // Calculate days overdue
      if (invoice.status !== 'PAID' && invoice.status !== 'CANCELLED') {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Add to appropriate aging bucket
        let bucketIndex = 0;
        if (daysOverdue >= 91) bucketIndex = 3;
        else if (daysOverdue >= 61) bucketIndex = 2;
        else if (daysOverdue >= 31) bucketIndex = 1;

        agingBuckets[bucketIndex].amount += due.toNumber();
        agingBuckets[bucketIndex].invoiceCount += 1;
      }
    }

    // Calculate percentages
    const totalOutstandingNum = totalOutstanding.toNumber();
    agingBuckets.forEach(bucket => {
      bucket.percentOfTotal = totalOutstandingNum > 0
        ? (bucket.amount / totalOutstandingNum) * 100
        : 0;
    });

    // Credit calculations
    const creditLimit = customer.creditLimit
      ? new Decimal(customer.creditLimit).toNumber()
      : Infinity;
    const creditAvailable = creditLimit === Infinity
      ? Infinity
      : Math.max(0, creditLimit - totalOutstandingNum);
    const creditUtilization = creditLimit === Infinity
      ? 0
      : (totalOutstandingNum / creditLimit) * 100;

    // Risk assessment
    let riskScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (agingBuckets[3].amount > 0) riskScore = 'CRITICAL'; // 90+ days
    else if (agingBuckets[2].amount > 0) riskScore = 'HIGH'; // 61-90 days
    else if (agingBuckets[1].amount > 0) riskScore = 'MEDIUM'; // 31-60 days

    const isCreditHold = creditUtilization > 100;

    return {
      totalOutstanding: totalOutstandingNum,
      totalPaid: totalPaid.toNumber(),
      totalInvoiced: totalInvoiced.toNumber(),
      creditAvailable: creditAvailable === Infinity ? 0 : creditAvailable,
      creditUtilization,
      agingSummary: {
        current: agingBuckets[0].amount,
        days31_60: agingBuckets[1].amount,
        days61_90: agingBuckets[2].amount,
        days90Plus: agingBuckets[3].amount,
        buckets: agingBuckets,
      },
      isCreditHold,
      riskScore,
    };
  }

  /**
   * Perform credit check for new sales order
   */
  async performCreditCheck(
    customerId: string,
    organizationId: string,
    proposedAmount: number
  ): Promise<CustomerCreditCheck> {
    const customer = await this.getCustomerWithFinancials(customerId, organizationId);
    const { financialSummary } = customer;

    const creditLimit = customer.creditLimit
      ? new Decimal(customer.creditLimit).toNumber()
      : Infinity;

    const currentBalance = financialSummary.totalOutstanding;
    const newBalance = currentBalance + proposedAmount;

    // Check if exceeds credit limit
    if (creditLimit !== Infinity && newBalance > creditLimit) {
      return {
        isApproved: false,
        creditLimit,
        currentBalance,
        proposedAmount,
        availableCredit: Math.max(0, creditLimit - currentBalance),
        reason: `Proposed amount exceeds available credit. Credit limit: ${creditLimit}, Current balance: ${currentBalance}, Available: ${creditLimit - currentBalance}`,
        requiresApproval: true,
      };
    }

    // Check if customer is on credit hold (90+ days overdue)
    if (financialSummary.agingSummary.days90Plus > 0) {
      return {
        isApproved: false,
        creditLimit,
        currentBalance,
        proposedAmount,
        availableCredit: Math.max(0, creditLimit - currentBalance),
        reason: `Customer has outstanding invoices over 90 days past due. Amount: ${financialSummary.agingSummary.days90Plus}`,
        requiresApproval: true,
      };
    }

    // Approved
    return {
      isApproved: true,
      creditLimit,
      currentBalance,
      proposedAmount,
      availableCredit: creditLimit === Infinity ? Infinity : creditLimit - newBalance,
      requiresApproval: false,
    };
  }

  /**
   * Build display name from customer data
   */
  private buildDisplayName(customer: Customer): string {
    if (customer.companyName) {
      return customer.companyName;
    }
    return `${customer.firstName} ${customer.lastName}`.trim();
  }

  /**
   * Format address using regional conventions
   */
  private formatAddress(
    address: CustomerAddress | null,
    countryCode: string
  ): string {
    if (!address) return '';

    // For Uganda and East African countries, include district/region
    if (['UG', 'KE', 'TZ'].includes(countryCode)) {
      return [
        address.street,
        address.street2,
        address.district,
        address.city,
        address.region,
        address.postalCode,
        address.country,
      ]
        .filter(Boolean)
        .join(', ');
    }

    // Standard US/EU format
    return [
      address.street,
      address.street2,
      `${address.city}, ${address.state} ${address.postalCode}`,
      address.country,
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Get AR balance from General Ledger (source of truth)
   */
  async getArBalanceFromLedger(
    customerId: string,
    organizationId: string
  ): Promise<number> {
    // Find AR account for this organization
    const arAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: { startsWith: '1200' },
        accountType: 'ASSET',
        isActive: true,
      },
    });

    if (!arAccount) {
      throw new Error('Accounts Receivable account not found');
    }

    // Sum all ledger entries for transactions referencing this customer
    const result = await prisma.ledgerEntry.aggregate({
      where: {
        accountId: arAccount.id,
        transaction: {
          organizationId,
          referenceType: 'CUSTOMER',
          referenceId: customerId,
        },
      },
      _sum: {
        amountInBase: true,
      },
    });

    return result._sum.amountInBase
      ? new Decimal(result._sum.amountInBase).toNumber()
      : 0;
  }

  /**
   * Generate customer aging report
   */
  async generateAgingReport(
    organizationId: string,
    options: {
      asOfDate?: Date;
      includeInactive?: boolean;
      branchId?: string;
    } = {}
  ): Promise<{
    asOfDate: Date;
    customers: Array<{
      customerId: string;
      customerName: string;
      customerNumber: string;
      totalOutstanding: number;
      agingSummary: AgingSummary;
      riskScore: string;
    }>;
    totals: AgingSummary;
  }> {
    const asOfDate = options.asOfDate || new Date();

    const customers = await prisma.customer.findMany({
      where: {
        organizationId,
        ...(options.includeInactive !== true && { isActive: true }),
        ...(options.branchId && { branchId: options.branchId }),
      },
      include: {
        invoices: {
          where: {
            status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] },
            dueDate: { lte: asOfDate },
          },
          select: {
            id: true,
            total: true,
            amountDue: true,
            dueDate: true,
            currency: true,
            exchangeRate: true,
          },
        },
        payments: true,
      },
    });

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true, homeCountry: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const reportData = await Promise.all(
      customers.map(async (customer) => {
        const financialSummary = await this.calculateFinancialSummary(
          { ...customer, invoices: customer.invoices || [], payments: customer.payments || [] },
          organization.baseCurrency
        );

        return {
          customerId: customer.id,
          customerName: this.buildDisplayName(customer),
          customerNumber: customer.customerNumber,
          totalOutstanding: financialSummary.totalOutstanding,
          agingSummary: financialSummary.agingSummary,
          riskScore: financialSummary.riskScore,
        };
      })
    );

    // Calculate totals
    const totals: AgingSummary = {
      current: 0,
      days31_60: 0,
      days61_90: 0,
      days90Plus: 0,
      buckets: [
        { label: 'Current (0-30 days)', daysRange: { min: 0, max: 30 }, amount: 0, invoiceCount: 0, percentOfTotal: 0 },
        { label: '31-60 days', daysRange: { min: 31, max: 60 }, amount: 0, invoiceCount: 0, percentOfTotal: 0 },
        { label: '61-90 days', daysRange: { min: 61, max: 90 }, amount: 0, invoiceCount: 0, percentOfTotal: 0 },
        { label: '90+ days', daysRange: { min: 91, max: null }, amount: 0, invoiceCount: 0, percentOfTotal: 0 },
      ],
    };

    reportData.forEach((customer) => {
      totals.current += customer.agingSummary.current;
      totals.days31_60 += customer.agingSummary.days31_60;
      totals.days61_90 += customer.agingSummary.days61_90;
      totals.days90Plus += customer.agingSummary.days90Plus;
      
      customer.agingSummary.buckets.forEach((bucket, index) => {
        totals.buckets[index].amount += bucket.amount;
        totals.buckets[index].invoiceCount += bucket.invoiceCount;
      });
    });

    const totalOutstanding = totals.current + totals.days31_60 + totals.days61_90 + totals.days90Plus;
    totals.buckets.forEach(bucket => {
      bucket.percentOfTotal = totalOutstanding > 0
        ? (bucket.amount / totalOutstanding) * 100
        : 0;
    });

    return {
      asOfDate,
      customers: reportData,
      totals,
    };
  }
}

export const customerService = new CustomerService();
