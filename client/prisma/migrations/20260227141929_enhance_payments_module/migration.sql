-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'MOBILE_MONEY';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "allocatedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "mobileMoneyProvider" TEXT,
ADD COLUMN     "mobileMoneyTxnId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT;

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
