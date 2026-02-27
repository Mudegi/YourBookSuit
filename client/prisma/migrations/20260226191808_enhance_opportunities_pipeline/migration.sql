-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "convertedEstimateId" TEXT,
ADD COLUMN     "convertedInvoiceId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "expectedCloseDate" TIMESTAMP(3),
ADD COLUMN     "lostDate" TIMESTAMP(3),
ADD COLUMN     "reasonLost" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "wonDate" TIMESTAMP(3),
ALTER COLUMN "stage" SET DEFAULT 'QUALIFICATION',
ALTER COLUMN "probability" SET DEFAULT 10;

-- CreateIndex
CREATE INDEX "Opportunity_assignedTo_idx" ON "Opportunity"("assignedTo");

-- CreateIndex
CREATE INDEX "Opportunity_branchId_idx" ON "Opportunity"("branchId");

-- CreateIndex
CREATE INDEX "Opportunity_expectedCloseDate_idx" ON "Opportunity"("expectedCloseDate");

-- CreateIndex
CREATE INDEX "Opportunity_companyId_idx" ON "Opportunity"("companyId");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
