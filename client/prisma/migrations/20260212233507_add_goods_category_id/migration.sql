/*
  Warnings:

  - You are about to drop the column `efrisApiKey` on the `EInvoiceConfig` table. All the data in the column will be lost.
  - You are about to drop the column `efrisApiSecret` on the `EInvoiceConfig` table. All the data in the column will be lost.
  - You are about to drop the column `efrisDeviceNo` on the `EInvoiceConfig` table. All the data in the column will be lost.
  - You are about to drop the column `efrisTIN` on the `EInvoiceConfig` table. All the data in the column will be lost.
  - You are about to drop the column `efrisTestMode` on the `EInvoiceConfig` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "TaxType" ADD VALUE 'DEEMED';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "buyerType" TEXT NOT NULL DEFAULT '1';

-- AlterTable
ALTER TABLE "EInvoiceConfig" DROP COLUMN "efrisApiKey",
DROP COLUMN "efrisApiSecret",
DROP COLUMN "efrisDeviceNo",
DROP COLUMN "efrisTIN",
DROP COLUMN "efrisTestMode",
ADD COLUMN     "testMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "buyerType" TEXT,
ADD COLUMN     "paymentMethod" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "deemedFlag" TEXT NOT NULL DEFAULT '2',
ADD COLUMN     "discountFlag" TEXT NOT NULL DEFAULT '2',
ADD COLUMN     "exciseCurrency" TEXT,
ADD COLUMN     "exciseDutyCode" TEXT,
ADD COLUMN     "exciseFlag" TEXT NOT NULL DEFAULT '2',
ADD COLUMN     "exciseRate" DECIMAL(21,8),
ADD COLUMN     "exciseRateName" TEXT,
ADD COLUMN     "exciseRule" TEXT,
ADD COLUMN     "exciseTax" DECIMAL(19,4),
ADD COLUMN     "exciseUnit" TEXT,
ADD COLUMN     "goodsCategoryId" TEXT,
ADD COLUMN     "pack" DECIMAL(12,8),
ADD COLUMN     "stick" DECIMAL(12,8);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "goodsCategoryId" TEXT;

-- AlterTable
ALTER TABLE "TaxRate" ADD COLUMN     "efrisGoodsCategoryId" TEXT,
ADD COLUMN     "efrisTaxCategoryCode" TEXT;
