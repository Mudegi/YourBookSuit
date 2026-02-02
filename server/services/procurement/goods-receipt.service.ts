import { PrismaClient, Prisma, EntryType, TransactionType } from '@prisma/client';
import { DoubleEntryService } from '@/services/accounting/double-entry.service';
import { LandedCostService } from '@/services/costing/landed-cost.service';

const prisma = new PrismaClient();

export interface GoodsReceiptInput {
  organizationId: string;
  purchaseOrderId?: string;
  vendorId: string;
  warehouseId?: string;
  receiptDate: Date;
  referenceNumber?: string;
  currency?: string;
  exchangeRate?: number;
  notes?: string;
  assetAccountId?: string;
  apAccountId?: string;
  
  landedCosts?: {
    freightCost?: number;
    insuranceCost?: number;
    customsDuty?: number;
    otherCosts?: number;
    allocationMethod?: 'BY_VALUE' | 'BY_WEIGHT' | 'BY_VOLUME' | 'BY_QUANTITY';
  };
  
  items: Array<{
    productId: string;
    poItemId?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    description?: string;
    weight?: number;
    volume?: number;
  }>;
  
  postToGL?: boolean;
  createAPBill?: boolean;
  submitToEfris?: boolean;
}

export interface GoodsReceiptResult {
  goodsReceipt: any;
  stockMovements: any[];
  glTransaction?: any;
  apBill?: any;
  efrisResponse?: any;
  warnings: string[];
}

export class GoodsReceiptService {
  constructor(private db: Prisma.TransactionClient | PrismaClient = prisma) {}

  async createGoodsReceipt(input: GoodsReceiptInput, userId: string): Promise<GoodsReceiptResult> {
    const warnings: string[] = [];
    
    // Get organization
    const org = await this.db.organization.findUnique({
      where: { id: input.organizationId },
    });
    
    if (!org) throw new Error('Organization not found');
    
    const baseCurrency = org.baseCurrency || 'USD';
    const currency = input.currency || baseCurrency;
    const exchangeRate = input.exchangeRate || 1;
    
    // Validate vendor
    const vendor = await this.db.vendor.findUnique({
      where: { id: input.vendorId },
    });
    
    if (!vendor) throw new Error('Vendor not found');
    
    // If PO provided, validate
    let purchaseOrder: any = null;
    if (input.purchaseOrderId) {
      purchaseOrder = await this.db.purchaseOrder.findUnique({
        where: { id: input.purchaseOrderId },
        include: { items: true },
      });
      
      if (!purchaseOrder) throw new Error('Purchase Order not found');
      if (purchaseOrder.status === 'CANCELLED') {
        throw new Error('Cannot receive from cancelled PO');
      }
    }
    
    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const item of input.items) {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTax = itemSubtotal * ((item.taxRate || 0) / 100);
      subtotal += itemSubtotal;
      taxAmount += itemTax;
    }
    
    const total = subtotal + taxAmount;
    
    // Check price variances
    for (const item of input.items) {
      const product = await this.db.product.findUnique({
        where: { id: item.productId },
      });
      
      if (product && product.purchasePrice && Number(product.purchasePrice) > 0) {
        const lastPrice = Number(product.purchasePrice);
        const priceDiff = Math.abs(item.unitPrice - lastPrice);
        const percentDiff = (priceDiff / lastPrice) * 100;
        
        if (percentDiff > 10) {
          warnings.push(
            `${product.name}: Price variance ${percentDiff.toFixed(1)}% ` +
            `(Previous: ${lastPrice.toFixed(2)}, Current: ${item.unitPrice.toFixed(2)})`
          );
        }
      }
    }
    
    // Execute in transaction
    return await this.db.$transaction(async (tx) => {
      // Generate receipt number
      const receiptNumber = await this.generateReceiptNumber(tx, input.organizationId);
      
      // Create goods receipt
      const goodsReceipt = await tx.goodsReceipt.create({
        data: {
          organizationId: input.organizationId,
          receiptNumber,
          purchaseOrderId: input.purchaseOrderId,
          vendorId: input.vendorId,
          warehouseId: input.warehouseId,
          receiptDate: input.receiptDate,
          referenceNumber: input.referenceNumber,
          currency,
          exchangeRate: new Prisma.Decimal(exchangeRate),
          subtotal: new Prisma.Decimal(subtotal),
          taxAmount: new Prisma.Decimal(taxAmount),
          total: new Prisma.Decimal(total),
          status: 'RECEIVED',
          notes: input.notes,
          freightCost: input.landedCosts?.freightCost 
            ? new Prisma.Decimal(input.landedCosts.freightCost) 
            : null,
          insuranceCost: input.landedCosts?.insuranceCost 
            ? new Prisma.Decimal(input.landedCosts.insuranceCost) 
            : null,
          customsDuty: input.landedCosts?.customsDuty 
            ? new Prisma.Decimal(input.landedCosts.customsDuty) 
            : null,
          otherCosts: input.landedCosts?.otherCosts 
            ? new Prisma.Decimal(input.landedCosts.otherCosts) 
            : null,
          landedCostMethod: input.landedCosts?.allocationMethod,
          createdById: userId,
        },
      });
      
      // Create receipt items and update inventory
      const receiptItems = [];
      const stockMovements = [];
      
      for (const item of input.items) {
        // Create receipt item
        const itemTotal = item.quantity * item.unitPrice * (1 + (item.taxRate || 0) / 100);
        const itemTax = item.quantity * item.unitPrice * ((item.taxRate || 0) / 100);
        
        const receiptItem = await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId: goodsReceipt.id,
            productId: item.productId,
            poItemId: item.poItemId,
            description: item.description,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            taxRate: new Prisma.Decimal(item.taxRate || 0),
            taxAmount: new Prisma.Decimal(itemTax),
            total: new Prisma.Decimal(itemTotal),
            originalUnitCost: new Prisma.Decimal(item.unitPrice),
          },
        });
        
        receiptItems.push(receiptItem);
        
        // Create stock movement
        const stockMovement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: 'PURCHASE',
            quantity: item.quantity,
            unitCost: item.unitPrice,
            totalCost: item.quantity * item.unitPrice,
            warehouseLocation: input.warehouseId || 'Main',
            referenceType: 'GOODS_RECEIPT',
            referenceId: goodsReceipt.id,
            notes: `Goods Receipt ${receiptNumber}`,
            movementDate: input.receiptDate,
          },
        });
        
        stockMovements.push(stockMovement);
        
        // Update inventory with WAC
        await this.updateInventoryWithWAC(tx, {
          productId: item.productId,
          warehouseId: input.warehouseId,
          quantityAdded: item.quantity,
          unitCost: item.unitPrice,
        });
        
        // Update PO item received quantity
        if (item.poItemId) {
          const poItem = await tx.purchaseOrderItem.findUnique({
            where: { id: item.poItemId },
          });
          
          if (poItem) {
            await tx.purchaseOrderItem.update({
              where: { id: item.poItemId },
              data: {
                receivedQty: Number(poItem.receivedQty) + item.quantity,
              },
            });
          }
        }
        
        // Update product last purchase price
        await tx.product.update({
          where: { id: item.productId },
          data: {
            purchasePrice: new Prisma.Decimal(item.unitPrice),
            updatedAt: new Date(),
          },
        });
      }
      
      // Apply landed costs if provided
      if (input.landedCosts && this.hasLandedCosts(input.landedCosts)) {
        const landedCostService = new LandedCostService(tx as any);
        
        const totalLandedCosts = 
          (input.landedCosts.freightCost || 0) +
          (input.landedCosts.insuranceCost || 0) +
          (input.landedCosts.customsDuty || 0) +
          (input.landedCosts.otherCosts || 0);
        
        const landedCostResult = await landedCostService.createLandedCost({
          organizationId: input.organizationId,
          referenceType: 'PURCHASE_RECEIPT',
          referenceId: goodsReceipt.id,
          vendorId: input.vendorId,
          currency,
          exchangeRate,
          costComponents: {
            freightCost: input.landedCosts.freightCost || 0,
            insuranceCost: input.landedCosts.insuranceCost || 0,
            customsDuty: input.landedCosts.customsDuty || 0,
            handlingCost: 0,
            clearingAgentFees: 0,
            storageCost: 0,
            otherCosts: input.landedCosts.otherCosts || 0,
          },
          allocationMethod: input.landedCosts.allocationMethod || 'BY_VALUE',
          items: input.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitPrice,
            weight: item.weight,
            volume: item.volume,
          })),
          postToGL: input.postToGL,
        });
        
        // Update receipt items with landed costs
        for (const allocation of landedCostResult.allocatedItems) {
          const receiptItem = receiptItems.find(ri => ri.productId === allocation.productId);
          if (receiptItem) {
            await tx.goodsReceiptItem.update({
              where: { id: receiptItem.id },
              data: {
                landedUnitCost: new Prisma.Decimal(allocation.newUnitCost),
              },
            });
          }
        }
      }
      
      // Update PO status if all items received
      if (purchaseOrder) {
        const allReceived = await this.checkPOFullyReceived(tx, input.purchaseOrderId!);
        await tx.purchaseOrder.update({
          where: { id: input.purchaseOrderId },
          data: {
            status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
          },
        });
      }
      
      // Financial posting
      let glTransaction: any = null;
      if (input.postToGL) {
        glTransaction = await this.postToGL(tx, {
          goodsReceipt,
          items: receiptItems,
          vendor,
          organizationId: input.organizationId,
          userId,
          baseCurrency,
          exchangeRate,
          assetAccountId: input.assetAccountId,
          apAccountId: input.apAccountId,
        });
      }
      
      // Create AP Bill if requested
      let apBill: any = null;
      if (input.createAPBill) {
        apBill = await this.createAPBillFromReceipt(tx, {
          goodsReceipt,
          items: receiptItems,
          vendor,
          organizationId: input.organizationId,
        });
      }
      
      return {
        goodsReceipt,
        stockMovements,
        glTransaction,
        apBill,
        efrisResponse: null, // EFRIS handled separately
        warnings,
      };
    });
  }
  
  private async updateInventoryWithWAC(
    tx: any,
    params: {
      productId: string;
      warehouseId?: string;
      quantityAdded: number;
      unitCost: number;
    }
  ) {
    const { productId, warehouseId, quantityAdded, unitCost } = params;
    
    let inventoryItem = await tx.inventoryItem.findFirst({
      where: {
        productId,
        warehouseLocation: warehouseId || 'Main',
      },
    });
    
    if (!inventoryItem) {
      inventoryItem = await tx.inventoryItem.create({
        data: {
          productId,
          warehouseLocation: warehouseId || 'Main',
          quantityOnHand: 0,
          quantityAvailable: 0,
          averageCost: 0,
          totalValue: 0,
        },
      });
    }
    
    // Weighted Average Cost calculation
    const currentValue = Number(inventoryItem.totalValue);
    const currentQty = Number(inventoryItem.quantityOnHand);
    const addedValue = quantityAdded * unitCost;
    const newQty = currentQty + quantityAdded;
    const newValue = currentValue + addedValue;
    const newAvgCost = newQty > 0 ? newValue / newQty : unitCost;
    
    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        quantityOnHand: newQty,
        quantityAvailable: Number(inventoryItem.quantityAvailable) + quantityAdded,
        averageCost: new Prisma.Decimal(newAvgCost),
        totalValue: new Prisma.Decimal(newValue),
      },
    });
  }
  
  private async postToGL(
    tx: any,
    params: {
      goodsReceipt: any;
      items: any[];
      vendor: any;
      organizationId: string;
      userId: string;
      baseCurrency: string;
      exchangeRate: number;
      assetAccountId?: string;
      apAccountId?: string;
    }
  ): Promise<any> {
    const { goodsReceipt, items, vendor, organizationId, userId, baseCurrency, exchangeRate } = params;
    
    const totalInBaseCurrency = Number(goodsReceipt.total) * exchangeRate;
    const taxInBaseCurrency = Number(goodsReceipt.taxAmount) * exchangeRate;
    const subtotalInBaseCurrency = totalInBaseCurrency - taxInBaseCurrency;
    
    const entries = [];
    
    // Group items by inventory asset account
    const accountGroups = new Map<string, { account: string; amount: number; products: string[] }>();
    
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { 
          organization: true,
        },
      });
      
      if (!product) continue;
      
      // Get inventory asset account - use provided or product's default
      let assetAccountId = params.assetAccountId || product.assetAccountId;
      
      if (!assetAccountId) {
        throw new Error(`No asset account specified for product ${product.name}. Please select an inventory asset account.`);
      }
      
      const itemTotal = Number(item.quantity) * Number(item.unitPrice) * exchangeRate;
      
      const existing = accountGroups.get(assetAccountId);
      if (existing) {
        existing.amount += itemTotal;
        existing.products.push(product.name);
      } else {
        accountGroups.set(assetAccountId, {
          account: assetAccountId,
          amount: itemTotal,
          products: [product.name],
        });
      }
    }
    
    // Debit: Inventory Asset Accounts
    for (const [accountId, group] of accountGroups) {
      entries.push({
        accountId,
        entryType: EntryType.DEBIT,
        amount: group.amount,
        description: `Goods Receipt ${goodsReceipt.receiptNumber} - ${group.products.join(', ')}`,
      });
    }
    
    // Debit: VAT Receivable (Input VAT)
    if (taxInBaseCurrency > 0) {
      let vatReceivableAccount = await tx.chartOfAccount.findFirst({
        where: {
          organizationId,
          accountType: 'ASSET',
          OR: [
            { code: { contains: 'VAT' } },
            { name: { contains: 'VAT Receivable' } },
            { name: { contains: 'Input VAT' } },
          ],
        },
      });
      
      // Create default VAT Receivable account if it doesn't exist
      if (!vatReceivableAccount) {
        vatReceivableAccount = await tx.chartOfAccount.create({
          data: {
            organizationId,
            code: '1150',
            name: 'VAT Receivable (Input VAT)',
            accountType: 'ASSET',
            accountSubType: 'Current Asset',
            currency: org.baseCurrency || 'USD',
            description: 'Input VAT on purchases',
            isActive: true,
            isSystem: true,
            allowManualJournal: true,
          },
        });
      }
      
      entries.push({
        accountId: vatReceivableAccount.id,
        entryType: EntryType.DEBIT,
        amount: taxInBaseCurrency,
        description: `Input VAT - ${goodsReceipt.receiptNumber}`,
      });
    }
    
    // Credit: Accounts Payable - use provided or find default
    let apAccountId = params.apAccountId;
    
    if (!apAccountId) {
      const apAccount = await tx.chartOfAccount.findFirst({
        where: {
          organizationId,
          accountType: 'LIABILITY',
          OR: [
            { code: { contains: 'AP' } },
            { name: { contains: 'Accounts Payable' } },
            { name: { contains: 'Trade Payables' } },
          ],
        },
      });
      
      if (!apAccount) {
        throw new Error('No Accounts Payable account found. Please select an AP account.');
      }
      
      apAccountId = apAccount.id;
    }
    
    entries.push({
      accountId: apAccountId,
      entryType: EntryType.CREDIT,
      amount: totalInBaseCurrency,
      description: `Goods Receipt ${goodsReceipt.receiptNumber} - ${vendor.name}`,
    });
    
    // Create journal entry using DoubleEntryService
    const glTransaction = await DoubleEntryService.createTransaction({
      organizationId,
      transactionDate: goodsReceipt.receiptDate,
      transactionType: TransactionType.BILL,
      description: `Goods Receipt ${goodsReceipt.receiptNumber} from ${vendor.name}`,
      referenceType: 'GoodsReceipt',
      referenceId: goodsReceipt.id,
      createdById: userId,
      entries,
    });
    
    // Update goods receipt with GL reference and mark as posted
    await tx.goodsReceipt.update({
      where: { id: goodsReceipt.id },
      data: {
        glTransactionId: glTransaction.id,
        status: 'POSTED',
      },
    });
    
    return glTransaction;
  }
  
  private async createAPBillFromReceipt(
    tx: any,
    params: {
      goodsReceipt: any;
      items: any[];
      vendor: any;
      organizationId: string;
    }
  ): Promise<any> {
    const { goodsReceipt, items, vendor, organizationId } = params;
    
    // Generate bill number
    const billCount = await tx.bill.count({
      where: { organizationId },
    });
    const billNumber = `BILL-${String(billCount + 1).padStart(5, '0')}`;
    
    // Calculate due date from vendor payment terms
    const dueDate = new Date(goodsReceipt.receiptDate);
    dueDate.setDate(dueDate.getDate() + (vendor.paymentTerms || 30));
    
    // Create bill
    const bill = await tx.bill.create({
      data: {
        organizationId,
        vendorId: vendor.id,
        billNumber,
        billDate: goodsReceipt.receiptDate,
        dueDate,
        currency: goodsReceipt.currency,
        exchangeRate: goodsReceipt.exchangeRate,
        subtotal: goodsReceipt.subtotal,
        taxAmount: goodsReceipt.taxAmount,
        total: goodsReceipt.total,
        amountDue: goodsReceipt.total,
        status: 'PENDING',
        notes: `Auto-created from Goods Receipt ${goodsReceipt.receiptNumber}`,
      },
    });
    
    // Create bill items
    for (const item of items) {
      await tx.billItem.create({
        data: {
          billId: bill.id,
          productId: item.productId,
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        },
      });
    }
    
    // Link bill to goods receipt
    await tx.goodsReceipt.update({
      where: { id: goodsReceipt.id },
      data: { apBillId: bill.id },
    });
    
    return bill;
  }
  
  private async checkPOFullyReceived(tx: any, poId: string): Promise<boolean> {
    const poItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: poId },
    });
    
    return poItems.every(item => 
      Number(item.receivedQty) >= Number(item.quantity)
    );
  }
  
  private hasLandedCosts(costs: any): boolean {
    return !!(
      costs.freightCost || 
      costs.insuranceCost || 
      costs.customsDuty || 
      costs.otherCosts
    );
  }
  
  private async generateReceiptNumber(tx: any, organizationId: string): Promise<string> {
    const today = new Date();
    const prefix = `GR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    const lastReceipt = await tx.goodsReceipt.findFirst({
      where: {
        organizationId,
        receiptNumber: { startsWith: prefix },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    let sequence = 1;
    if (lastReceipt) {
      const lastSequence = parseInt(lastReceipt.receiptNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }
    
    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }
}

export default GoodsReceiptService;
