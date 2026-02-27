-- AlterEnum
ALTER TYPE "ReconciliationStatus" ADD VALUE 'FINALIZED';

-- AlterTable
ALTER TABLE "BankReconciliation" ADD COLUMN     "clearedPaymentIds" TEXT[],
ADD COLUMN     "clearedTransactionIds" TEXT[],
ADD COLUMN     "openingBalance" DECIMAL(19,4);

-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedByReconciliationId" TEXT;
