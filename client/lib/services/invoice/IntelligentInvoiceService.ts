/**
 * Intelligent Invoice Service
 * 
 * This service implements the "Intelligence Layer" for invoice creation:
 * - Country-blind tax calculation via LocalizationProvider
 * - Inventory validation and commitment
 * - Credit limit checks
 * - Price list integration
 * - E-invoicing integration
 * - GL posting via DoubleEntryService
 * - Multi-currency support
 */

import { prisma } from '@/lib/prisma';
import { LocalizationProvider } from '@/lib/localization/localization-provider';
import { initializeLocalizationDrivers } from '@/lib/localization/drivers';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';
import { DocumentSequenceService } from '@/lib/document-sequence.service';
import { TaxCalculationService, TaxCalculationMethod } from '@/lib/services/tax/TaxCalculationService';
import { Decimal } from '@prisma/client/runtime/library';

// Initialize localization drivers
initializeLocalizationDrivers();

export interface InvoiceLineInput {
  productId?: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice?: number; // Optional - will be fetched from price list if not provided
  discount?: number;
  discountPercent?: number;
  taxRateId?: string;
  taxCategory?: string;
  taxExempt?: boolean;
  taxExemptReason?: string;
  warehouseId?: string;
  notes?: string;
}

export interface CreateInvoiceInput {
  organizationId: string;
  customerId: string;
  invoiceDate: Date;
  dueDate: Date;
  currency?: string;
  exchangeRate?: number;
  branchId?: string;
  warehouseId?: string;
  salespersonId?: string;
  priceListId?: string;
  reference?: string; // Customer PO/LPO number
  notes?: string;
  terms?: string;
  attachments?: string[];
  taxCalculationMethod?: TaxCalculationMethod; // EXCLUSIVE or INCLUSIVE
  items: InvoiceLineInput[];
  
  // Options
  skipInventoryCheck?: boolean;
  skipCreditCheck?: boolean;
  autoCommitInventory?: boolean;
  autoSubmitToTaxAuthority?: boolean;
}

export interface InvoiceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  inventoryIssues?: InventoryIssue[];
  creditCheckResult?: CreditCheckResult;
}

export interface InventoryIssue {
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  shortfall: number;
}

export interface CreditCheckResult {
  passed: boolean;
  creditLimit: number;
  currentBalance: number;
  invoiceAmount: number;
  availableCredit: number;
  reason?: string;
}

export class IntelligentInvoiceService {
  private localizationProvider: LocalizationProvider;
  private doubleEntryService: DoubleEntryService;
  private documentSequenceService: DocumentSequenceService;

  constructor() {
    this.localizationProvider = new LocalizationProvider();
    this.doubleEntryService = new DoubleEntryService(prisma);
    this.documentSequenceService = new DocumentSequenceService(prisma);
  }

  /**
   * Validate invoice before creation
   * This is the "Intelligence Layer" - runs all checks
   */
  async validateInvoice(input: CreateInvoiceInput): Promise<InvoiceValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let inventoryIssues: InventoryIssue[] = [];
    let creditCheckResult: CreditCheckResult | undefined;

    // 1. Validate customer exists and is active
    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
      include: {
        organization: {
          include: {
            localizationConfig: true,
          },
        },
      },
    });

    if (!customer) {
      errors.push('Customer not found');
      return { valid: false, errors, warnings };
    }

    if (!customer.isActive) {
      errors.push('Customer is inactive');
    }

    // 2. Check if customer is on credit hold
    if (customer.isOnCreditHold) {
      errors.push('Customer is on credit hold');
    }

    // 3. Validate inventory availability (if not skipped)
    if (!input.skipInventoryCheck) {
      inventoryIssues = await this.checkInventoryAvailability(
        input.items,
        input.warehouseId || customer.organization.id
      );

      if (inventoryIssues.length > 0) {
        warnings.push(`${inventoryIssues.length} item(s) have insufficient stock`);
      }
    }

    // 4. Check credit limit (if not skipped)
    if (!input.skipCreditCheck && customer.creditLimit) {
      creditCheckResult = await this.checkCreditLimit(
        input.customerId,
        await this.calculateInvoiceTotal(input)
      );

      if (!creditCheckResult.passed) {
        errors.push(creditCheckResult.reason || 'Credit limit exceeded');
      }
    }

    // 5. Validate tax configuration
    const homeCountry = customer.organization.homeCountry;
    const localizationConfig = customer.organization.localizationConfig;
    
    if (!localizationConfig) {
      warnings.push('No localization configuration found, using defaults');
    }

    // 6. Validate line items
    if (input.items.length === 0) {
      errors.push('Invoice must have at least one line item');
    }

    for (const item of input.items) {
      if (!item.productId && !item.serviceId) {
        errors.push('Each line item must reference a product or service');
      }

      if (item.quantity <= 0) {
        errors.push('Quantity must be greater than zero');
      }

      if (item.unitPrice !== undefined && item.unitPrice < 0) {
        errors.push('Unit price cannot be negative');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      inventoryIssues: inventoryIssues.length > 0 ? inventoryIssues : undefined,
      creditCheckResult,
    };
  }

  /**
   * Create intelligent invoice with all validations and hooks
   */
  async createInvoice(input: CreateInvoiceInput) {
    // Step 1: Validate
    const validation = await this.validateInvoice(input);
    if (!validation.valid) {
      throw new Error(`Invoice validation failed: ${validation.errors.join(', ')}`);
    }

    // Step 2: Get customer and organization details
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: input.customerId },
      include: {
        organization: {
          include: {
            localizationConfig: true,
          },
        },
      },
    });

    const organization = customer.organization;

    // Step 3: Get currency and exchange rate
    const currency = input.currency || customer.currency || organization.baseCurrency;
    const exchangeRate = input.exchangeRate || (await this.getExchangeRate(currency, organization.baseCurrency));

    // Step 4: Get price list (customer's preferred or organization's default)
    const priceListId = input.priceListId || customer.priceListId || (await this.getDefaultPriceList(organization.id));

    // Step 5: Enrich line items with prices from price list
    const enrichedItems = await this.enrichLineItems(input.items, priceListId, organization.id);

    // Step 6: Calculate taxes using LocalizationProvider (country-blind) + TaxCalculationService
    const taxCalculationMethod = input.taxCalculationMethod || 'EXCLUSIVE';
    const itemsWithTaxes = await this.calculateTaxes(
      enrichedItems,
      customer,
      organization,
      taxCalculationMethod
    );

    // Step 7: Calculate totals
    const { subtotal, taxAmount, discountAmount, total } = this.calculateTotals(itemsWithTaxes);
    const baseCurrencyTotal = total * exchangeRate;

    // Step 8: Check if requires approval
    const requiresApproval = this.checkIfRequiresApproval(total, customer, organization);
    const approvalReason = requiresApproval
      ? `Invoice amount ${currency} ${total.toFixed(2)} exceeds approval threshold`
      : undefined;

    // Step 9: Generate invoice number
    const invoiceNumber = await this.documentSequenceService.getNext(
      organization.id,
      'INVOICE',
      input.branchId || null,
      new Date().getFullYear(),
      new Date().getMonth() + 1
    );

    // Step 10: Calculate salesperson commission
    let commissionAmount: number | undefined;
    let commissionRate: number | undefined;
    if (input.salespersonId) {
      const salesperson = await prisma.user.findUnique({
        where: { id: input.salespersonId },
      });
      // Fetch commission rate from salesperson settings or organization defaults
      commissionRate = 5.0; // Example: 5%
      commissionAmount = (total * commissionRate) / 100;
    }

    // Step 11: Check credit and determine status
    const creditCheckPassed = validation.creditCheckResult?.passed ?? true;
    const creditCheckNotes = validation.creditCheckResult
      ? `Available credit: ${currency} ${validation.creditCheckResult.availableCredit.toFixed(2)}`
      : undefined;

    // Step 12: Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: organization.id,
        customerId: input.customerId,
        invoiceNumber,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        currency,
        exchangeRate: new Decimal(exchangeRate),
        baseCurrencyTotal: new Decimal(baseCurrencyTotal),
        subtotal: new Decimal(subtotal),
        taxAmount: new Decimal(taxAmount),
        discountAmount: new Decimal(discountAmount),
        total: new Decimal(total),
        amountDue: new Decimal(total),
        taxCalculationMethod, // Store calculation method for audit trail
        status: requiresApproval ? 'DRAFT' : 'ISSUED',
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        priceListId,
        salespersonId: input.salespersonId,
        commissionRate: commissionRate ? new Decimal(commissionRate) : undefined,
        commissionAmount: commissionAmount ? new Decimal(commissionAmount) : undefined,
        reference: input.reference,
        notes: input.notes,
        terms: input.terms || customer.paymentTerms,
        attachments: input.attachments || [],
        creditCheckPassed,
        creditCheckNotes,
        requiresApproval,
        approvalReason,
        approvalStatus: requiresApproval ? 'PENDING' : null,
        eInvoiceStatus: 'PENDING',
        items: {
          create: itemsWithTaxes.map((item, index) => ({
            productId: item.productId,
            serviceId: item.serviceId,
            description: item.description,
            quantity: new Decimal(item.quantity),
            unitPrice: new Decimal(item.unitPrice),
            netAmount: item.netAmount ? new Decimal(item.netAmount) : undefined,
            listPrice: item.listPrice ? new Decimal(item.listPrice) : undefined,
            discount: new Decimal(item.discount || 0),
            discountPercent: item.discountPercent ? new Decimal(item.discountPercent) : undefined,
            taxRate: new Decimal(item.taxRate || 0),
            taxAmount: new Decimal(item.taxAmount || 0),
            taxCategory: item.taxCategory,
            taxRateId: item.taxRateId,
            taxExempt: item.taxExempt || false,
            taxExemptReason: item.taxExemptReason,
            subtotal: new Decimal(item.subtotal),
            total: new Decimal(item.itemTotal),
            warehouseId: item.warehouseId,
            sortOrder: index,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
        Branch: true,
      },
    });

    // Step 13: Commit inventory (if enabled)
    if (input.autoCommitInventory) {
      await this.commitInventory(invoice.id, itemsWithTaxes, input.warehouseId);
    }

    // Step 14: Post to GL (if not requiring approval)
    if (!requiresApproval) {
      await this.postToGeneralLedger(invoice);
    }

    // Step 15: Submit to tax authority (if enabled and not requiring approval)
    if (input.autoSubmitToTaxAuthority && !requiresApproval) {
      await this.submitToTaxAuthority(invoice.id, organization);
    }

    return invoice;
  }

  /**
   * Check inventory availability for all line items
   */
  private async checkInventoryAvailability(
    items: InvoiceLineInput[],
    warehouseId: string
  ): Promise<InventoryIssue[]> {
    const issues: InventoryIssue[] = [];

    for (const item of items) {
      if (!item.productId) continue; // Services don't need inventory

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          inventoryTracking: {
            where: { warehouseId },
          },
        },
      });

      if (!product) continue;

      const availableQty = product.inventoryTracking[0]?.quantityOnHand || 0;
      if (availableQty < item.quantity) {
        issues.push({
          productId: item.productId,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableQuantity: Number(availableQty),
          shortfall: item.quantity - Number(availableQty),
        });
      }
    }

    return issues;
  }

  /**
   * Check customer credit limit
   */
  private async checkCreditLimit(
    customerId: string,
    invoiceAmount: number
  ): Promise<CreditCheckResult> {
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      include: {
        invoices: {
          where: {
            status: {
              in: ['ISSUED', 'OVERDUE'],
            },
          },
          select: {
            amountDue: true,
          },
        },
      },
    });

    const creditLimit = Number(customer.creditLimit || 0);
    const currentBalance = customer.invoices.reduce(
      (sum, inv) => sum + Number(inv.amountDue),
      0
    );
    const availableCredit = creditLimit - currentBalance;
    const passed = availableCredit >= invoiceAmount;

    return {
      passed,
      creditLimit,
      currentBalance,
      invoiceAmount,
      availableCredit,
      reason: passed
        ? undefined
        : `Insufficient credit. Available: ${availableCredit.toFixed(2)}, Required: ${invoiceAmount.toFixed(2)}`,
    };
  }

  /**
   * Enrich line items with prices from price list
   */
  private async enrichLineItems(
    items: InvoiceLineInput[],
    priceListId: string | null,
    organizationId: string
  ) {
    const enriched = [];

    for (const item of items) {
      let unitPrice = item.unitPrice;
      let listPrice: number | undefined;

      // If no price provided, fetch from price list
      if (unitPrice === undefined && item.productId && priceListId) {
        const priceListItem = await prisma.priceListItem.findFirst({
          where: {
            priceListId,
            productId: item.productId,
            OR: [
              { minQuantity: null },
              { minQuantity: { lte: new Decimal(item.quantity) } },
            ],
          },
          orderBy: {
            minQuantity: 'desc',
          },
        });

        if (priceListItem) {
          listPrice = Number(priceListItem.price);
          unitPrice = listPrice;
        }
      }

      // If still no price, fetch from product
      if (unitPrice === undefined && item.productId) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          unitPrice = Number(product.unitPrice);
        }
      }

      // If still no price, fetch from service
      if (unitPrice === undefined && item.serviceId) {
        const service = await prisma.serviceCatalog.findUnique({
          where: { id: item.serviceId },
        });

        if (service) {
          unitPrice = Number(service.rate);
        }
      }

      if (unitPrice === undefined) {
        throw new Error(
          `Cannot determine price for item: ${item.description}`
        );
      }

      enriched.push({
        ...item,
        unitPrice,
        listPrice,
      });
    }

    return enriched;
  }

  /**
   * Calculate taxes using LocalizationProvider (country-blind)
   */
  private async calculateTaxes(
    items: any[],
    customer: any,
    organization: any,
    taxCalculationMethod: TaxCalculationMethod = 'EXCLUSIVE'
  ) {
    const taxProvider = this.localizationProvider.getTaxProvider(organization.homeCountry);

    const itemsWithTaxes = [];

    for (const item of items) {
      // Get tax rate
      let taxRate = 0;
      let taxCategory = item.taxCategory;
      let taxRateId = item.taxRateId;

      if (!item.taxExempt) {
        if (item.taxRateId) {
          // Use specific tax rate
          const taxRateConfig = await prisma.taxRate.findUnique({
            where: { id: item.taxRateId },
          });

          if (taxRateConfig) {
            taxRate = Number(taxRateConfig.rate);
            taxCategory = taxRateConfig.category;
          }
        } else {
          // Use default tax calculation via localization
          const productType = item.productId ? 'GOODS' : 'SERVICES';
          const preliminaryAmount = item.quantity * item.unitPrice;
          
          const taxResult = await taxProvider.calculateTax({
            amount: preliminaryAmount,
            taxType: productType,
            customerCountry: customer.country || organization.homeCountry,
            isTaxExempt: customer.isTaxExempt || false,
          });

          taxRate = taxResult.taxRate;
          taxCategory = taxResult.taxCategory;
        }
      }

      // Use TaxCalculationService for precise calculation
      const calculationResult = TaxCalculationService.calculateLineItem({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        taxRate: taxRate,
        discount: item.discount || 0,
        calculationMethod: taxCalculationMethod,
      });

      itemsWithTaxes.push({
        ...item,
        netAmount: Number(calculationResult.netAmount),
        subtotal: Number(calculationResult.lineNetAmount),
        taxRate: Number(calculationResult.taxRate),
        taxAmount: Number(calculationResult.taxAmount),
        taxCategory,
        taxRateId,
        itemTotal: Number(calculationResult.grossAmount),
      });
    }

    return itemsWithTaxes;
  }

  /**
   * Calculate invoice totals
   */
  private calculateTotals(items: any[]) {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const discountAmount = items.reduce((sum, item) => sum + (item.discount || 0), 0);
    const total = subtotal - discountAmount + taxAmount;

    return {
      subtotal,
      taxAmount,
      discountAmount,
      total,
    };
  }

  /**
   * Calculate estimated invoice total (for validation)
   */
  private async calculateInvoiceTotal(input: CreateInvoiceInput): Promise<number> {
    let total = 0;

    for (const item of input.items) {
      const unitPrice = item.unitPrice || 0;
      const quantity = item.quantity || 0;
      const discount = item.discount || 0;
      const lineTotal = quantity * unitPrice - discount;
      
      // Add estimated tax (15% default)
      const estimatedTax = lineTotal * 0.15;
      total += lineTotal + estimatedTax;
    }

    return total;
  }

  /**
   * Check if invoice requires approval
   */
  private checkIfRequiresApproval(
    invoiceTotal: number,
    customer: any,
    organization: any
  ): boolean {
    // Example logic: require approval if:
    // 1. Invoice amount > $10,000
    // 2. Customer is on credit hold
    // 3. Customer credit limit exceeded

    if (invoiceTotal > 10000) {
      return true;
    }

    if (customer.isOnCreditHold) {
      return true;
    }

    return false;
  }

  /**
   * Get exchange rate
   */
  private async getExchangeRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    // TODO: Fetch from exchange rate service
    // For now, return 1.0
    return 1.0;
  }

  /**
   * Get default price list for organization
   */
  private async getDefaultPriceList(organizationId: string): Promise<string | null> {
    const priceList = await prisma.priceList.findFirst({
      where: {
        organizationId,
        isDefault: true,
        isActive: true,
      },
    });

    return priceList?.id || null;
  }

  /**
   * Commit inventory for invoice items
   */
  private async commitInventory(
    invoiceId: string,
    items: any[],
    warehouseId?: string
  ) {
    for (const item of items) {
      if (!item.productId) continue;

      // Create stock reservation
      await prisma.stockReservation.create({
        data: {
          organizationId: item.organizationId,
          productId: item.productId,
          warehouseId: warehouseId!,
          referenceType: 'INVOICE',
          referenceId: invoiceId,
          quantity: new Decimal(item.quantity),
          status: 'COMMITTED',
        },
      });
    }

    // Mark invoice as committed
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        inventoryCommitted: true,
        inventoryCommittedAt: new Date(),
      },
    });
  }

  /**
   * Post invoice to general ledger
   */
  private async postToGeneralLedger(invoice: any) {
    // Debit: Accounts Receivable
    // Credit: Revenue
    // Credit: Tax Payable

    const transaction = await this.doubleEntryService.createTransaction({
      organizationId: invoice.organizationId,
      date: invoice.invoiceDate,
      reference: invoice.invoiceNumber,
      description: `Invoice to ${invoice.customer.name}`,
      entries: [
        // Debit A/R
        {
          accountCode: '1200',
          debit: Number(invoice.total),
          credit: 0,
          description: `Invoice ${invoice.invoiceNumber}`,
        },
        // Credit Revenue
        {
          accountCode: '4000',
          debit: 0,
          credit: Number(invoice.subtotal) - Number(invoice.discountAmount),
          description: `Invoice ${invoice.invoiceNumber}`,
        },
        // Credit Tax Payable
        {
          accountCode: '2100',
          debit: 0,
          credit: Number(invoice.taxAmount),
          description: `Tax on Invoice ${invoice.invoiceNumber}`,
        },
      ],
    });

    // Link transaction to invoice
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        transactionId: transaction.id,
      },
    });
  }

  /**
   * Submit invoice to tax authority for fiscalization
   */
  private async submitToTaxAuthority(invoiceId: string, organization: any) {
    // This hooks into the e-invoicing service
    // Implementation depends on country (EFRIS for Uganda, eTIMS for Kenya, etc.)

    try {
      const invoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        include: {
          items: true,
          customer: true,
        },
      });

      // Example: Submit to EFRIS
      // const eInvoicingService = this.localizationProvider.getEInvoicingService(organization.homeCountry);
      // const result = await eInvoicingService.submitInvoice(invoice);

      // For now, mark as submitted
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          eInvoiceStatus: 'SUBMITTED',
          eInvoiceSubmittedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('E-invoicing submission failed:', error);
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          eInvoiceStatus: 'FAILED',
        },
      });
    }
  }
}
