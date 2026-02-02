-- AlterTable
ALTER TABLE "BillItem" ADD COLUMN     "serviceId" TEXT,
ADD COLUMN     "taxAgencyRateId" TEXT;

-- AlterTable
ALTER TABLE "ChartOfAccount" ADD COLUMN     "allowManualJournal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "foreignBalance" DECIMAL(19,4),
ADD COLUMN     "fullPath" TEXT,
ADD COLUMN     "hasChildren" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isBankAccount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "requiresDimension" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "approvalReason" TEXT,
ADD COLUMN     "approvalStatus" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "baseCurrencyTotal" DECIMAL(19,4),
ADD COLUMN     "commissionAmount" DECIMAL(19,4),
ADD COLUMN     "commissionRate" DECIMAL(5,2),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "creditCheckNotes" TEXT,
ADD COLUMN     "creditCheckPassed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "digitalSignature" TEXT,
ADD COLUMN     "eInvoiceResponse" JSONB,
ADD COLUMN     "eInvoiceStatus" TEXT,
ADD COLUMN     "eInvoiceSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "inventoryCommitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inventoryCommittedAt" TIMESTAMP(3),
ADD COLUMN     "priceListId" TEXT,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "salespersonId" TEXT,
ADD COLUMN     "shippingAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "taxCalculationMethod" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "discountPercent" DECIMAL(5,2),
ADD COLUMN     "listPrice" DECIMAL(19,4),
ADD COLUMN     "netAmount" DECIMAL(19,4),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "priceListItemId" TEXT,
ADD COLUMN     "serviceId" TEXT,
ADD COLUMN     "stockCommitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stockReservedQty" DECIMAL(12,4),
ADD COLUMN     "subtotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAgencyRateId" TEXT,
ADD COLUMN     "taxExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxExemptReason" TEXT,
ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "businessModel" TEXT NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "taxGroupId" TEXT;

-- AlterTable
ALTER TABLE "ServiceCatalog" ADD COLUMN     "taxGroupId" TEXT;

-- AlterTable
ALTER TABLE "TaxRate" ADD COLUMN     "calculationType" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
ADD COLUMN     "isInclusiveByDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchaseTaxAccountId" TEXT,
ADD COLUMN     "recoveryType" TEXT NOT NULL DEFAULT 'PAYABLE',
ADD COLUMN     "salesTaxAccountId" TEXT;

-- CreateTable
CREATE TABLE "TaxAgency" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "country" TEXT NOT NULL,
    "taxType" "TaxType" NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "liabilityAccountId" TEXT,
    "filingFrequency" TEXT,
    "filingDeadlineDays" INTEGER,
    "nextFilingDate" TIMESTAMP(3),
    "apiEndpoint" TEXT,
    "apiCredentials" JSONB,
    "externalSystemId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxAgency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxAgencyRate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taxAgencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "rate" DECIMAL(5,2) NOT NULL,
    "isInclusiveDefault" BOOLEAN NOT NULL DEFAULT false,
    "calculationType" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
    "salesTaxAccountId" TEXT,
    "purchaseTaxAccountId" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "externalTaxCode" TEXT,
    "reportingCategory" TEXT,
    "exemptionReasonCode" TEXT,
    "isRecoverable" BOOLEAN NOT NULL DEFAULT true,
    "recoveryPercentage" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxAgencyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxGroup" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taxAgencyId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "compoundMethod" TEXT NOT NULL DEFAULT 'SEQUENTIAL',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxGroupRate" (
    "id" TEXT NOT NULL,
    "taxGroupId" TEXT NOT NULL,
    "taxAgencyRateId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "isCompound" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxGroupRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxExemptionReason" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "country" TEXT,
    "externalCode" TEXT,
    "requiresDocumentation" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxExemptionReason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxAgency_organizationId_country_idx" ON "TaxAgency"("organizationId", "country");

-- CreateIndex
CREATE INDEX "TaxAgency_taxType_isActive_idx" ON "TaxAgency"("taxType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TaxAgency_organizationId_code_key" ON "TaxAgency"("organizationId", "code");

-- CreateIndex
CREATE INDEX "TaxAgencyRate_organizationId_isActive_idx" ON "TaxAgencyRate"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "TaxAgencyRate_effectiveFrom_effectiveTo_idx" ON "TaxAgencyRate"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "TaxAgencyRate_externalTaxCode_idx" ON "TaxAgencyRate"("externalTaxCode");

-- CreateIndex
CREATE UNIQUE INDEX "TaxAgencyRate_organizationId_taxAgencyId_name_key" ON "TaxAgencyRate"("organizationId", "taxAgencyId", "name");

-- CreateIndex
CREATE INDEX "TaxGroup_organizationId_isActive_idx" ON "TaxGroup"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TaxGroup_organizationId_code_key" ON "TaxGroup"("organizationId", "code");

-- CreateIndex
CREATE INDEX "TaxGroupRate_taxGroupId_sequence_idx" ON "TaxGroupRate"("taxGroupId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "TaxGroupRate_taxGroupId_taxAgencyRateId_key" ON "TaxGroupRate"("taxGroupId", "taxAgencyRateId");

-- CreateIndex
CREATE INDEX "TaxExemptionReason_organizationId_category_idx" ON "TaxExemptionReason"("organizationId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "TaxExemptionReason_organizationId_code_key" ON "TaxExemptionReason"("organizationId", "code");

-- CreateIndex
CREATE INDEX "BillItem_serviceId_idx" ON "BillItem"("serviceId");

-- CreateIndex
CREATE INDEX "BillItem_taxAgencyRateId_idx" ON "BillItem"("taxAgencyRateId");

-- CreateIndex
CREATE INDEX "ChartOfAccount_currency_idx" ON "ChartOfAccount"("currency");

-- CreateIndex
CREATE INDEX "ChartOfAccount_isActive_idx" ON "ChartOfAccount"("isActive");

-- CreateIndex
CREATE INDEX "Invoice_branchId_idx" ON "Invoice"("branchId");

-- CreateIndex
CREATE INDEX "Invoice_createdById_idx" ON "Invoice"("createdById");

-- CreateIndex
CREATE INDEX "Invoice_salespersonId_idx" ON "Invoice"("salespersonId");

-- CreateIndex
CREATE INDEX "Invoice_eInvoiceStatus_idx" ON "Invoice"("eInvoiceStatus");

-- CreateIndex
CREATE INDEX "InvoiceItem_serviceId_idx" ON "InvoiceItem"("serviceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_taxAgencyRateId_idx" ON "InvoiceItem"("taxAgencyRateId");

-- CreateIndex
CREATE INDEX "InvoiceItem_warehouseId_idx" ON "InvoiceItem"("warehouseId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_taxAgencyRateId_fkey" FOREIGN KEY ("taxAgencyRateId") REFERENCES "TaxAgencyRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_taxAgencyRateId_fkey" FOREIGN KEY ("taxAgencyRateId") REFERENCES "TaxAgencyRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_taxGroupId_fkey" FOREIGN KEY ("taxGroupId") REFERENCES "TaxGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxAgency" ADD CONSTRAINT "TaxAgency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxAgency" ADD CONSTRAINT "TaxAgency_liabilityAccountId_fkey" FOREIGN KEY ("liabilityAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxAgencyRate" ADD CONSTRAINT "TaxAgencyRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxAgencyRate" ADD CONSTRAINT "TaxAgencyRate_taxAgencyId_fkey" FOREIGN KEY ("taxAgencyId") REFERENCES "TaxAgency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxAgencyRate" ADD CONSTRAINT "TaxAgencyRate_salesTaxAccountId_fkey" FOREIGN KEY ("salesTaxAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxAgencyRate" ADD CONSTRAINT "TaxAgencyRate_purchaseTaxAccountId_fkey" FOREIGN KEY ("purchaseTaxAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGroup" ADD CONSTRAINT "TaxGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGroup" ADD CONSTRAINT "TaxGroup_taxAgencyId_fkey" FOREIGN KEY ("taxAgencyId") REFERENCES "TaxAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGroupRate" ADD CONSTRAINT "TaxGroupRate_taxGroupId_fkey" FOREIGN KEY ("taxGroupId") REFERENCES "TaxGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGroupRate" ADD CONSTRAINT "TaxGroupRate_taxAgencyRateId_fkey" FOREIGN KEY ("taxAgencyRateId") REFERENCES "TaxAgencyRate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxExemptionReason" ADD CONSTRAINT "TaxExemptionReason_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_taxGroupId_fkey" FOREIGN KEY ("taxGroupId") REFERENCES "TaxGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
