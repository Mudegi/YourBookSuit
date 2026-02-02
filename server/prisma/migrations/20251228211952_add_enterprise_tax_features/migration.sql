/*
  Warnings:

  - You are about to drop the column `county` on the `TaxJurisdiction` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `TaxJurisdiction` table. All the data in the column will be lost.
  - Added the required column `ruleType` to the `TaxRule` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `taxType` on the `TaxRule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TaxRuleType" AS ENUM ('STANDARD_RATE', 'REDUCED_RATE', 'ZERO_RATE', 'EXEMPTION', 'REVERSE_CHARGE', 'COMPOUND', 'WITHHOLDING', 'CUSTOM');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "taxExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxExemptionReason" TEXT;

-- AlterTable
ALTER TABLE "TaxJurisdiction" DROP COLUMN "county",
DROP COLUMN "state",
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "countyDistrict" TEXT,
ADD COLUMN     "eInvoiceFormat" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "parentJurisdictionId" TEXT,
ADD COLUMN     "postalCodeEnd" TEXT,
ADD COLUMN     "postalCodeStart" TEXT,
ADD COLUMN     "requiresEInvoicing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stateProvince" TEXT,
ADD COLUMN     "taxLiabilityAccountId" TEXT;

-- AlterTable
ALTER TABLE "TaxRule" ADD COLUMN     "customerType" TEXT,
ADD COLUMN     "parentRuleId" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ruleType" "TaxRuleType" NOT NULL,
DROP COLUMN "taxType",
ADD COLUMN     "taxType" "TaxRuleType" NOT NULL;

-- CreateIndex
CREATE INDEX "TaxJurisdiction_taxLiabilityAccountId_idx" ON "TaxJurisdiction"("taxLiabilityAccountId");

-- CreateIndex
CREATE INDEX "TaxRule_organizationId_taxType_idx" ON "TaxRule"("organizationId", "taxType");

-- CreateIndex
CREATE INDEX "TaxRule_ruleType_priority_idx" ON "TaxRule"("ruleType", "priority");

-- AddForeignKey
ALTER TABLE "TaxJurisdiction" ADD CONSTRAINT "TaxJurisdiction_parentJurisdictionId_fkey" FOREIGN KEY ("parentJurisdictionId") REFERENCES "TaxJurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxJurisdiction" ADD CONSTRAINT "TaxJurisdiction_taxLiabilityAccountId_fkey" FOREIGN KEY ("taxLiabilityAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_parentRuleId_fkey" FOREIGN KEY ("parentRuleId") REFERENCES "TaxRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
