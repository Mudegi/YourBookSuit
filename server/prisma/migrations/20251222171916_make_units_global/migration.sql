-- AlterTable
ALTER TABLE "UnitOfMeasure" ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "organizationId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "UnitOfMeasure_isGlobal_idx" ON "UnitOfMeasure"("isGlobal");
