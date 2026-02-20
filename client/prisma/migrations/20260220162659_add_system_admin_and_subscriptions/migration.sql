-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'TRIAL_EXPIRED', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "EFRISExcisableList" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "exciseRule" TEXT,
ADD COLUMN     "exciseUnit" TEXT,
ADD COLUMN     "rateText" TEXT,
ALTER COLUMN "exciseRate" SET DATA TYPE DECIMAL(21,8),
ALTER COLUMN "effectiveFrom" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionStartDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "suspendedReason" TEXT,
ADD COLUMN     "trialEndDate" TIMESTAMP(3),
ADD COLUMN     "trialStartDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSystemAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EFRISCommodityCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "commodityCategoryCode" TEXT NOT NULL,
    "commodityCategoryName" TEXT NOT NULL,
    "parentCode" TEXT,
    "commodityCategoryLevel" TEXT,
    "rate" TEXT,
    "isLeafNode" TEXT,
    "serviceMark" TEXT,
    "isZeroRate" TEXT,
    "isExempt" TEXT,
    "excisable" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EFRISCommodityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EFRISCommodityCategory_organizationId_isActive_idx" ON "EFRISCommodityCategory"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "EFRISCommodityCategory_organizationId_isLeafNode_idx" ON "EFRISCommodityCategory"("organizationId", "isLeafNode");

-- CreateIndex
CREATE UNIQUE INDEX "EFRISCommodityCategory_organizationId_commodityCategoryCode_key" ON "EFRISCommodityCategory"("organizationId", "commodityCategoryCode");

-- AddForeignKey
ALTER TABLE "EFRISCommodityCategory" ADD CONSTRAINT "EFRISCommodityCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
