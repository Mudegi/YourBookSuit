-- AlterTable
ALTER TABLE "TaxAgencyRate" ADD COLUMN     "applicableContext" TEXT[] DEFAULT ARRAY['SALES', 'PURCHASES']::TEXT[],
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "fixedAmount" DECIMAL(18,2),
ADD COLUMN     "isCompoundTax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "updatedBy" TEXT,
ALTER COLUMN "rate" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "calculationType" SET DEFAULT 'PERCENTAGE';
