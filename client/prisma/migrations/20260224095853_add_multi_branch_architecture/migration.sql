-- CreateEnum
CREATE TYPE "IBTStatus" AS ENUM ('DRAFT', 'REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'INTER_BRANCH_TRANSFER';

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "prefix" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "OrganizationUser" ADD COLUMN     "branchRestricted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserBranchAccess" (
    "id" TEXT NOT NULL,
    "organizationUserId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBranchAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterBranchTransfer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toBranchId" TEXT NOT NULL,
    "status" "IBTStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "shippedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "clearingAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterBranchTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterBranchTransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "InterBranchTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBranchAccess_organizationUserId_idx" ON "UserBranchAccess"("organizationUserId");

-- CreateIndex
CREATE INDEX "UserBranchAccess_branchId_idx" ON "UserBranchAccess"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBranchAccess_organizationUserId_branchId_key" ON "UserBranchAccess"("organizationUserId", "branchId");

-- CreateIndex
CREATE INDEX "InterBranchTransfer_organizationId_idx" ON "InterBranchTransfer"("organizationId");

-- CreateIndex
CREATE INDEX "InterBranchTransfer_fromBranchId_idx" ON "InterBranchTransfer"("fromBranchId");

-- CreateIndex
CREATE INDEX "InterBranchTransfer_toBranchId_idx" ON "InterBranchTransfer"("toBranchId");

-- CreateIndex
CREATE INDEX "InterBranchTransfer_status_idx" ON "InterBranchTransfer"("status");

-- CreateIndex
CREATE INDEX "InterBranchTransferItem_transferId_idx" ON "InterBranchTransferItem"("transferId");

-- AddForeignKey
ALTER TABLE "UserBranchAccess" ADD CONSTRAINT "UserBranchAccess_organizationUserId_fkey" FOREIGN KEY ("organizationUserId") REFERENCES "OrganizationUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranchAccess" ADD CONSTRAINT "UserBranchAccess_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterBranchTransfer" ADD CONSTRAINT "InterBranchTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterBranchTransfer" ADD CONSTRAINT "InterBranchTransfer_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterBranchTransfer" ADD CONSTRAINT "InterBranchTransfer_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterBranchTransferItem" ADD CONSTRAINT "InterBranchTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "InterBranchTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterBranchTransferItem" ADD CONSTRAINT "InterBranchTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
