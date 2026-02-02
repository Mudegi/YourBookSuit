-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "defaultRevenueAccountId" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "taxCategory" TEXT,
ALTER COLUMN "email" DROP NOT NULL;
