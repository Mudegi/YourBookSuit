-- AlterTable
ALTER TABLE "BankReconciliation" ADD COLUMN     "adjustedBookBalance" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "adjustmentEntries" JSONB,
ADD COLUMN     "depositsInTransit" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "outstandingChecks" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "reconciliationReport" TEXT;

-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "clearedDate" TIMESTAMP(3),
ADD COLUMN     "isReconciled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reconciliationId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "isReconciled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reconciledDate" TIMESTAMP(3),
ADD COLUMN     "reconciliationId" TEXT;

-- CreateIndex
CREATE INDEX "BankReconciliation_status_idx" ON "BankReconciliation"("status");

-- CreateIndex
CREATE INDEX "BankTransaction_reconciliationId_idx" ON "BankTransaction"("reconciliationId");

-- CreateIndex
CREATE INDEX "BankTransaction_isReconciled_idx" ON "BankTransaction"("isReconciled");

-- CreateIndex
CREATE INDEX "Payment_isReconciled_idx" ON "Payment"("isReconciled");

-- CreateIndex
CREATE INDEX "Payment_reconciliationId_idx" ON "Payment"("reconciliationId");

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
