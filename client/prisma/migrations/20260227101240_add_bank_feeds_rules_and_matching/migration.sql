/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,duplicateHash]` on the table `BankTransaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "appliedRuleId" TEXT,
ADD COLUMN     "categoryAccountId" TEXT,
ADD COLUMN     "duplicateHash" TEXT,
ADD COLUMN     "matchedBillId" TEXT,
ADD COLUMN     "matchedInvoiceId" TEXT,
ADD COLUMN     "rawDescription" TEXT,
ALTER COLUMN "status" SET DEFAULT 'UNPROCESSED';

-- CreateTable
CREATE TABLE "BankRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "conditionField" TEXT NOT NULL DEFAULT 'description',
    "conditionOperator" TEXT NOT NULL DEFAULT 'contains',
    "conditionValue" TEXT NOT NULL,
    "categoryAccountId" TEXT,
    "taxRateId" TEXT,
    "payee" TEXT,
    "timesApplied" INTEGER NOT NULL DEFAULT 0,
    "lastAppliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankRule_organizationId_isActive_idx" ON "BankRule"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "BankRule_priority_idx" ON "BankRule"("priority");

-- CreateIndex
CREATE INDEX "BankTransaction_organizationId_status_idx" ON "BankTransaction"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BankTransaction_appliedRuleId_idx" ON "BankTransaction"("appliedRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_organizationId_duplicateHash_key" ON "BankTransaction"("organizationId", "duplicateHash");

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_appliedRuleId_fkey" FOREIGN KEY ("appliedRuleId") REFERENCES "BankRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankRule" ADD CONSTRAINT "BankRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
