-- DropIndex
DROP INDEX "Product_organizationId_sku_key";

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "efrisReference" TEXT,
ADD COLUMN     "efrisStatus" TEXT,
ADD COLUMN     "efrisSubmitted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CreditNote" ADD COLUMN     "eInvoiceResponse" JSONB,
ADD COLUMN     "eInvoiceStatus" TEXT,
ADD COLUMN     "eInvoiceSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "efrisFDN" TEXT,
ADD COLUMN     "efrisQRCode" TEXT,
ADD COLUMN     "efrisVerificationCode" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "efrisItemCode" TEXT,
ADD COLUMN     "efrisProductCode" TEXT,
ADD COLUMN     "efrisRegisteredAt" TIMESTAMP(3),
ADD COLUMN     "exciseDutyCode" TEXT;

-- CreateIndex
CREATE INDEX "CreditNote_efrisFDN_idx" ON "CreditNote"("efrisFDN");

-- CreateIndex
CREATE INDEX "Product_organizationId_sku_idx" ON "Product"("organizationId", "sku");
