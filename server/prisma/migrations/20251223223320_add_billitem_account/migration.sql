/*
  Warnings:

  - You are about to drop the column `isGlobal` on the `UnitOfMeasure` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId,code]` on the table `UnitOfMeasure` will be added. If there are existing duplicate values, this will fail.
  - Made the column `organizationId` on table `UnitOfMeasure` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "UnitOfMeasure_code_organizationId_key";

-- DropIndex
DROP INDEX "UnitOfMeasure_isGlobal_idx";

-- AlterTable
ALTER TABLE "BillItem" ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "UnitOfMeasure" DROP COLUMN "isGlobal",
ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "BillItem_accountId_idx" ON "BillItem"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_organizationId_code_key" ON "UnitOfMeasure"("organizationId", "code");

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
