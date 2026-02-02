-- AlterTable
ALTER TABLE "LocalizationConfig" ADD COLUMN     "apiEndpoints" JSONB,
ADD COLUMN     "complianceDrivers" JSONB,
ADD COLUMN     "digitalFiscalization" JSONB,
ADD COLUMN     "fiscalCalendar" JSONB,
ADD COLUMN     "regulatoryBodies" JSONB,
ADD COLUMN     "taxReturnTemplates" JSONB,
ADD COLUMN     "translationKeys" JSONB;
