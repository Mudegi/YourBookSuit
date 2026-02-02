/*
  Warnings:

  - Added the required column `createdById` to the `QualityHold` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "HoldType" AS ENUM ('QUALITY', 'SAFETY', 'REGULATORY', 'SUPPLIER_RECALL', 'CUSTOMER_COMPLAINT', 'INTERNAL_REVIEW');

-- AlterTable
ALTER TABLE "QualityHold" ADD COLUMN     "attachments" JSONB,
ADD COLUMN     "batchNumber" TEXT,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "holdType" "HoldType" NOT NULL DEFAULT 'QUALITY',
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "serialNumber" TEXT;

-- AddForeignKey
ALTER TABLE "QualityHold" ADD CONSTRAINT "QualityHold_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
