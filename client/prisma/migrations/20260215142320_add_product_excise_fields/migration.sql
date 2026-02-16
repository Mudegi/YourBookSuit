-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "exciseRate" DECIMAL(21,8),
ADD COLUMN     "exciseRule" TEXT,
ADD COLUMN     "exciseUnit" TEXT,
ADD COLUMN     "pack" DECIMAL(12,8),
ADD COLUMN     "stick" DECIMAL(12,8);
