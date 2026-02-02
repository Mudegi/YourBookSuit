-- CreateEnum
CREATE TYPE "CAPASource" AS ENUM ('NCR', 'AUDIT', 'CUSTOMER_COMPLAINT', 'MANAGEMENT_REVIEW', 'INTERNAL_REVIEW', 'SUPPLIER_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "CAPARiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CAPAInvestigationMethod" AS ENUM ('FIVE_WHY', 'FISHBONE', 'PARETO', 'FMEA', 'OTHER');

-- CreateEnum
CREATE TYPE "CapaTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "CAPA" ADD COLUMN     "closureDate" TIMESTAMP(3),
ADD COLUMN     "investigationMethod" "CAPAInvestigationMethod",
ADD COLUMN     "localData" JSONB,
ADD COLUMN     "riskLevel" "CAPARiskLevel" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "source" "CAPASource" NOT NULL DEFAULT 'NCR';

-- AlterTable
ALTER TABLE "NonConformanceReport" ADD COLUMN     "localComplianceData" JSONB;

-- CreateTable
CREATE TABLE "CapaTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "capaId" TEXT NOT NULL,
    "taskNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "CapaTaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CAPAPriority" NOT NULL DEFAULT 'MEDIUM',
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "notes" TEXT,
    "localData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapaTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CapaTask_organizationId_status_idx" ON "CapaTask"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CapaTask_capaId_idx" ON "CapaTask"("capaId");

-- CreateIndex
CREATE UNIQUE INDEX "CapaTask_organizationId_capaId_taskNumber_key" ON "CapaTask"("organizationId", "capaId", "taskNumber");

-- CreateIndex
CREATE INDEX "CAPA_source_idx" ON "CAPA"("source");

-- CreateIndex
CREATE INDEX "CAPA_riskLevel_idx" ON "CAPA"("riskLevel");

-- AddForeignKey
ALTER TABLE "CapaTask" ADD CONSTRAINT "CapaTask_capaId_fkey" FOREIGN KEY ("capaId") REFERENCES "CAPA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaTask" ADD CONSTRAINT "CapaTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaTask" ADD CONSTRAINT "CapaTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaTask" ADD CONSTRAINT "CapaTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
