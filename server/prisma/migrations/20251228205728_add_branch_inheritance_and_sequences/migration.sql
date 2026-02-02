-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'BILL', 'CREDIT_NOTE', 'DEBIT_NOTE', 'PAYMENT', 'CUSTOMER', 'VENDOR', 'TRANSACTION');

-- CreateTable
CREATE TABLE "DocumentSequence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER,
    "month" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentSequence_organizationId_idx" ON "DocumentSequence"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentSequence_branchId_idx" ON "DocumentSequence"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSequence_organizationId_branchId_documentType_year__key" ON "DocumentSequence"("organizationId", "branchId", "documentType", "year", "month");

-- AddForeignKey
ALTER TABLE "DocumentSequence" ADD CONSTRAINT "DocumentSequence_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSequence" ADD CONSTRAINT "DocumentSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
