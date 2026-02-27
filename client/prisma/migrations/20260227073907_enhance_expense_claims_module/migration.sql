/*
  Warnings:

  - A unique constraint covering the columns `[reimbursementTxnId]` on the table `ExpenseClaim` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,claimNumber]` on the table `ExpenseClaim` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationId` to the `ExpenseClaim` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpenseClaimStatus" ADD VALUE 'ACCOUNTING_REVIEW';
ALTER TYPE "ExpenseClaimStatus" ADD VALUE 'QUERIED';

-- DropIndex
DROP INDEX "ExpenseClaim_employeeId_claimNumber_key";

-- AlterTable
ALTER TABLE "ExpenseClaim" ADD COLUMN     "accountingValidatedAt" TIMESTAMP(3),
ADD COLUMN     "accountingValidatedBy" TEXT,
ADD COLUMN     "amountInBase" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1,
ADD COLUMN     "merchantName" TEXT,
ADD COLUMN     "netAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "paidViaPayroll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "payrollRunId" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "reimbursementTxnId" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "totalTax" DECIMAL(19,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ExpenseItem" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "merchantName" TEXT,
ADD COLUMN     "netAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "receiptName" TEXT,
ADD COLUMN     "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ExpensePolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryPattern" TEXT,
    "maxAmountPerItem" DECIMAL(19,4),
    "maxDailyTotal" DECIMAL(19,4),
    "maxMonthlyTotal" DECIMAL(19,4),
    "requiresReceipt" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "autoApproveBelow" DECIMAL(19,4),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpensePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpensePolicy_organizationId_idx" ON "ExpensePolicy"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpensePolicy_organizationId_name_key" ON "ExpensePolicy"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseClaim_reimbursementTxnId_key" ON "ExpenseClaim"("reimbursementTxnId");

-- CreateIndex
CREATE INDEX "ExpenseClaim_organizationId_status_idx" ON "ExpenseClaim"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ExpenseClaim_claimDate_idx" ON "ExpenseClaim"("claimDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseClaim_organizationId_claimNumber_key" ON "ExpenseClaim"("organizationId", "claimNumber");

-- CreateIndex
CREATE INDEX "ExpenseItem_categoryId_idx" ON "ExpenseItem"("categoryId");

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpensePolicy" ADD CONSTRAINT "ExpensePolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
