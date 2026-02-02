-- AlterTable
ALTER TABLE "TaxExemption" ADD COLUMN     "documentPath" TEXT,
ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "efrisReason" TEXT,
ADD COLUMN     "issuedDate" TIMESTAMP(3),
ADD COLUMN     "issuingAuthority" TEXT,
ALTER COLUMN "validTo" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "TaxExemption_issuingAuthority_idx" ON "TaxExemption"("issuingAuthority");

-- CreateIndex
CREATE INDEX "TaxExemption_exemptionType_idx" ON "TaxExemption"("exemptionType");
