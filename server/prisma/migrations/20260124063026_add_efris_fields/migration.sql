-- AlterTable
ALTER TABLE "EInvoiceConfig" ADD COLUMN     "efrisApiKey" TEXT,
ADD COLUMN     "efrisApiSecret" TEXT,
ADD COLUMN     "efrisDeviceNo" TEXT,
ADD COLUMN     "efrisTIN" TEXT,
ADD COLUMN     "efrisTestMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "efrisVerificationCode" TEXT;
