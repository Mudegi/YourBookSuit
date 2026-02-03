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
