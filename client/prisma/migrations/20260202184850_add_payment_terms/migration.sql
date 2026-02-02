-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "paymentTermId" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "paymentTermId" TEXT;

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

-- CreateIndex
CREATE INDEX "PaymentTerm_organizationId_idx" ON "PaymentTerm"("organizationId");

-- CreateIndex
CREATE INDEX "PaymentTerm_isDefault_idx" ON "PaymentTerm"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerm_organizationId_code_key" ON "PaymentTerm"("organizationId", "code");

-- CreateIndex
CREATE INDEX "Customer_paymentTermId_idx" ON "Customer"("paymentTermId");

-- CreateIndex
CREATE INDEX "Vendor_paymentTermId_idx" ON "Vendor"("paymentTermId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerm" ADD CONSTRAINT "PaymentTerm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
