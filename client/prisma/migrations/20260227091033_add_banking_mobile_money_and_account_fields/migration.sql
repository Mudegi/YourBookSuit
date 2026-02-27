/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,glAccountId]` on the table `BankAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BankAccountType" ADD VALUE 'CASH';
ALTER TYPE "BankAccountType" ADD VALUE 'MOBILE_MONEY';
ALTER TYPE "BankAccountType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastReconciledBalance" DECIMAL(19,4),
ADD COLUMN     "lastReconciledDate" TIMESTAMP(3),
ADD COLUMN     "mobileMerchantId" TEXT,
ADD COLUMN     "mobileShortcode" TEXT,
ADD COLUMN     "routingNumber" TEXT,
ADD COLUMN     "statementBalance" DECIMAL(19,4),
ADD COLUMN     "swiftCode" TEXT;

-- CreateIndex
CREATE INDEX "BankAccount_organizationId_accountType_idx" ON "BankAccount"("organizationId", "accountType");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_organizationId_glAccountId_key" ON "BankAccount"("organizationId", "glAccountId");
