-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "contactRole" TEXT NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "extension" TEXT,
ADD COLUMN     "isDecisionMaker" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastInteractionAt" TIMESTAMP(3),
ADD COLUMN     "linkedIn" TEXT,
ADD COLUMN     "optOutMarketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sendInvoicesWhatsApp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp" TEXT,
ALTER COLUMN "companyId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Contact_organizationId_contactRole_idx" ON "Contact"("organizationId", "contactRole");

-- CreateIndex
CREATE INDEX "Contact_branchId_idx" ON "Contact"("branchId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
