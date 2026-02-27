-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "accountManagerId" TEXT,
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "defaultCurrency" TEXT,
ADD COLUMN     "defaultPaymentTerms" INTEGER,
ADD COLUMN     "lastContactedAt" TIMESTAMP(3),
ADD COLUMN     "lifecycleStage" TEXT NOT NULL DEFAULT 'LEAD',
ADD COLUMN     "lifetimeValue" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "outstandingBalance" DECIMAL(19,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "department" TEXT,
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CrmTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmTask_organizationId_companyId_idx" ON "CrmTask"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "CrmTask_assignedTo_idx" ON "CrmTask"("assignedTo");

-- CreateIndex
CREATE INDEX "CrmTask_dueDate_idx" ON "CrmTask"("dueDate");

-- CreateIndex
CREATE INDEX "CrmTask_status_idx" ON "CrmTask"("status");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE INDEX "Company_organizationId_lifecycleStage_idx" ON "Company"("organizationId", "lifecycleStage");

-- CreateIndex
CREATE INDEX "Company_accountManagerId_idx" ON "Company"("accountManagerId");

-- CreateIndex
CREATE INDEX "Company_branchId_idx" ON "Company"("branchId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
