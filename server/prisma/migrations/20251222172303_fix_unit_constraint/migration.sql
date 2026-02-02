/*
  Warnings:

  - A unique constraint covering the columns `[code,organizationId]` on the table `UnitOfMeasure` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UnitOfMeasure_organizationId_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_code_organizationId_key" ON "UnitOfMeasure"("code", "organizationId");
