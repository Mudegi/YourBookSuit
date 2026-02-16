-- CreateEnum
CREATE TYPE "SalesReceiptStatus" AS ENUM ('COMPLETED', 'VOIDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'SALES_RECEIPT';
ALTER TYPE "DocumentType" ADD VALUE 'JOURNAL';

-- AlterTable
ALTER TABLE "BankReconciliation" ADD COLUMN     "adjustedBookBalance" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "adjustmentEntries" JSONB,
ADD COLUMN     "depositsInTransit" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "outstandingChecks" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "reconciliationReport" TEXT;

-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "clearedDate" TIMESTAMP(3),
ADD COLUMN     "isReconciled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reconciliationId" TEXT;

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "efrisReference" TEXT,
ADD COLUMN     "efrisStatus" TEXT,
ADD COLUMN     "efrisSubmitted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "paymentTermId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "defaultExchangeRateProvider" TEXT DEFAULT 'MANUAL',
ADD COLUMN     "enableAutoFetchRates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exchangeRateBufferPercent" DECIMAL(5,2),
ADD COLUMN     "fxGainAccountId" TEXT,
ADD COLUMN     "fxLossAccountId" TEXT,
ADD COLUMN     "unrealizedFxGainAccountId" TEXT,
ADD COLUMN     "unrealizedFxLossAccountId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "baseCurrencyAmount" DECIMAL(19,4),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "fxGainLossAccountId" TEXT,
ADD COLUMN     "fxGainLossAmount" DECIMAL(19,4),
ADD COLUMN     "isReconciled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reconciledDate" TIMESTAMP(3),
ADD COLUMN     "reconciliationId" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "efrisItemCode" TEXT,
ADD COLUMN     "efrisProductCode" TEXT,
ADD COLUMN     "efrisRegisteredAt" TIMESTAMP(3),
ADD COLUMN     "exciseDutyCode" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "paymentTermId" TEXT;

-- CreateTable
CREATE TABLE "SalesReceipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "baseCurrencyTotal" DECIMAL(19,4),
    "subtotal" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(19,4) NOT NULL,
    "taxCalculationMethod" TEXT NOT NULL DEFAULT 'INCLUSIVE',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceNumber" TEXT,
    "depositToAccountId" TEXT NOT NULL,
    "mobileNetwork" TEXT,
    "payerPhoneNumber" TEXT,
    "branchId" TEXT,
    "warehouseId" TEXT,
    "status" "SalesReceiptStatus" NOT NULL DEFAULT 'COMPLETED',
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "transactionId" TEXT,
    "efrisFDN" TEXT,
    "efrisVerificationCode" TEXT,
    "efrisQRCode" TEXT,
    "eInvoiceStatus" TEXT,
    "eInvoiceSubmittedAt" TIMESTAMP(3),
    "eInvoiceResponse" JSONB,
    "inventoryDeducted" BOOLEAN NOT NULL DEFAULT false,
    "inventoryDeductedAt" TIMESTAMP(3),
    "salespersonId" TEXT,
    "commissionRate" DECIMAL(5,2),
    "commissionAmount" DECIMAL(19,4),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReceiptItem" (
    "id" TEXT NOT NULL,
    "salesReceiptId" TEXT NOT NULL,
    "productId" TEXT,
    "serviceId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unitPrice" DECIMAL(19,4) NOT NULL,
    "discount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "discountType" TEXT NOT NULL DEFAULT 'AMOUNT',
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "taxRuleId" TEXT,
    "lineTotal" DECIMAL(19,4) NOT NULL,
    "warehouseId" TEXT,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "unitCost" DECIMAL(19,4),

    CONSTRAINT "SalesReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReceiptTaxLine" (
    "id" TEXT NOT NULL,
    "salesReceiptItemId" TEXT NOT NULL,
    "taxRuleId" TEXT,
    "jurisdictionId" TEXT,
    "taxType" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "baseAmount" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL,
    "isCompound" BOOLEAN NOT NULL DEFAULT false,
    "compoundSequence" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesReceiptTaxLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTerm" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "daysUntilDue" INTEGER NOT NULL,
    "discountPercentage" DECIMAL(5,2),
    "discountDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromCurrencyCode" TEXT NOT NULL,
    "toCurrencyCode" TEXT NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeignExchangeGainLoss" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "transactionId" TEXT,
    "paymentId" TEXT,
    "invoiceId" TEXT,
    "billId" TEXT,
    "fxType" TEXT NOT NULL,
    "foreignCurrency" TEXT NOT NULL,
    "foreignAmount" DECIMAL(19,4) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "transactionRate" DECIMAL(18,6) NOT NULL,
    "transactionBaseAmount" DECIMAL(19,4) NOT NULL,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "settlementRate" DECIMAL(18,6) NOT NULL,
    "settlementBaseAmount" DECIMAL(19,4) NOT NULL,
    "gainLossAmount" DECIMAL(19,4) NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeignExchangeGainLoss_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesReceipt_organizationId_status_idx" ON "SalesReceipt"("organizationId", "status");

-- CreateIndex
CREATE INDEX "SalesReceipt_customerId_idx" ON "SalesReceipt"("customerId");

-- CreateIndex
CREATE INDEX "SalesReceipt_depositToAccountId_idx" ON "SalesReceipt"("depositToAccountId");

-- CreateIndex
CREATE INDEX "SalesReceipt_efrisFDN_idx" ON "SalesReceipt"("efrisFDN");

-- CreateIndex
CREATE INDEX "SalesReceipt_branchId_idx" ON "SalesReceipt"("branchId");

-- CreateIndex
CREATE INDEX "SalesReceipt_createdById_idx" ON "SalesReceipt"("createdById");

-- CreateIndex
CREATE INDEX "SalesReceipt_paymentMethod_idx" ON "SalesReceipt"("paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "SalesReceipt_organizationId_receiptNumber_key" ON "SalesReceipt"("organizationId", "receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SalesReceipt_organizationId_referenceNumber_receiptDate_key" ON "SalesReceipt"("organizationId", "referenceNumber", "receiptDate");

-- CreateIndex
CREATE INDEX "SalesReceiptItem_salesReceiptId_idx" ON "SalesReceiptItem"("salesReceiptId");

-- CreateIndex
CREATE INDEX "SalesReceiptItem_productId_idx" ON "SalesReceiptItem"("productId");

-- CreateIndex
CREATE INDEX "SalesReceiptItem_serviceId_idx" ON "SalesReceiptItem"("serviceId");

-- CreateIndex
CREATE INDEX "SalesReceiptItem_warehouseId_idx" ON "SalesReceiptItem"("warehouseId");

-- CreateIndex
CREATE INDEX "SalesReceiptTaxLine_salesReceiptItemId_idx" ON "SalesReceiptTaxLine"("salesReceiptItemId");

-- CreateIndex
CREATE INDEX "SalesReceiptTaxLine_taxRuleId_idx" ON "SalesReceiptTaxLine"("taxRuleId");

-- CreateIndex
CREATE INDEX "SalesReceiptTaxLine_jurisdictionId_idx" ON "SalesReceiptTaxLine"("jurisdictionId");

-- CreateIndex
CREATE INDEX "PaymentTerm_organizationId_idx" ON "PaymentTerm"("organizationId");

-- CreateIndex
CREATE INDEX "PaymentTerm_isDefault_idx" ON "PaymentTerm"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerm_organizationId_code_key" ON "PaymentTerm"("organizationId", "code");

-- CreateIndex
CREATE INDEX "Currency_organizationId_idx" ON "Currency"("organizationId");

-- CreateIndex
CREATE INDEX "Currency_isActive_idx" ON "Currency"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_organizationId_code_key" ON "Currency"("organizationId", "code");

-- CreateIndex
CREATE INDEX "ExchangeRate_organizationId_idx" ON "ExchangeRate"("organizationId");

-- CreateIndex
CREATE INDEX "ExchangeRate_effectiveDate_idx" ON "ExchangeRate"("effectiveDate");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrencyCode_toCurrencyCode_idx" ON "ExchangeRate"("fromCurrencyCode", "toCurrencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_organizationId_fromCurrencyCode_toCurrencyCode_key" ON "ExchangeRate"("organizationId", "fromCurrencyCode", "toCurrencyCode", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "ForeignExchangeGainLoss_paymentId_key" ON "ForeignExchangeGainLoss"("paymentId");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_organizationId_idx" ON "ForeignExchangeGainLoss"("organizationId");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_paymentId_idx" ON "ForeignExchangeGainLoss"("paymentId");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_invoiceId_idx" ON "ForeignExchangeGainLoss"("invoiceId");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_billId_idx" ON "ForeignExchangeGainLoss"("billId");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_fxType_idx" ON "ForeignExchangeGainLoss"("fxType");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_settlementDate_idx" ON "ForeignExchangeGainLoss"("settlementDate");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_foreignCurrency_idx" ON "ForeignExchangeGainLoss"("foreignCurrency");

-- CreateIndex
CREATE INDEX "BankReconciliation_status_idx" ON "BankReconciliation"("status");

-- CreateIndex
CREATE INDEX "BankTransaction_reconciliationId_idx" ON "BankTransaction"("reconciliationId");

-- CreateIndex
CREATE INDEX "BankTransaction_isReconciled_idx" ON "BankTransaction"("isReconciled");

-- CreateIndex
CREATE INDEX "Customer_paymentTermId_idx" ON "Customer"("paymentTermId");

-- CreateIndex
CREATE INDEX "Payment_createdById_idx" ON "Payment"("createdById");

-- CreateIndex
CREATE INDEX "Payment_isReconciled_idx" ON "Payment"("isReconciled");

-- CreateIndex
CREATE INDEX "Payment_reconciliationId_idx" ON "Payment"("reconciliationId");

-- CreateIndex
CREATE INDEX "Payment_currency_idx" ON "Payment"("currency");

-- CreateIndex
CREATE INDEX "Vendor_paymentTermId_idx" ON "Vendor"("paymentTermId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceipt" ADD CONSTRAINT "SalesReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceipt" ADD CONSTRAINT "SalesReceipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceipt" ADD CONSTRAINT "SalesReceipt_depositToAccountId_fkey" FOREIGN KEY ("depositToAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceipt" ADD CONSTRAINT "SalesReceipt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceipt" ADD CONSTRAINT "SalesReceipt_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceiptItem" ADD CONSTRAINT "SalesReceiptItem_salesReceiptId_fkey" FOREIGN KEY ("salesReceiptId") REFERENCES "SalesReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceiptItem" ADD CONSTRAINT "SalesReceiptItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceiptItem" ADD CONSTRAINT "SalesReceiptItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceiptItem" ADD CONSTRAINT "SalesReceiptItem_taxRuleId_fkey" FOREIGN KEY ("taxRuleId") REFERENCES "TaxRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceiptItem" ADD CONSTRAINT "SalesReceiptItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceiptTaxLine" ADD CONSTRAINT "SalesReceiptTaxLine_salesReceiptItemId_fkey" FOREIGN KEY ("salesReceiptItemId") REFERENCES "SalesReceiptItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceiptTaxLine" ADD CONSTRAINT "SalesReceiptTaxLine_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReceiptTaxLine" ADD CONSTRAINT "SalesReceiptTaxLine_taxRuleId_fkey" FOREIGN KEY ("taxRuleId") REFERENCES "TaxRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerm" ADD CONSTRAINT "PaymentTerm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Currency" ADD CONSTRAINT "Currency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_organizationId_fromCurrencyCode_fkey" FOREIGN KEY ("organizationId", "fromCurrencyCode") REFERENCES "Currency"("organizationId", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_organizationId_toCurrencyCode_fkey" FOREIGN KEY ("organizationId", "toCurrencyCode") REFERENCES "Currency"("organizationId", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeignExchangeGainLoss" ADD CONSTRAINT "ForeignExchangeGainLoss_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeignExchangeGainLoss" ADD CONSTRAINT "ForeignExchangeGainLoss_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeignExchangeGainLoss" ADD CONSTRAINT "ForeignExchangeGainLoss_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeignExchangeGainLoss" ADD CONSTRAINT "ForeignExchangeGainLoss_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
