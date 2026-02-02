-- CreateTable
CREATE TABLE "TaxPeriodLock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedByUserId" TEXT NOT NULL,
    "lockedReason" TEXT,

    CONSTRAINT "TaxPeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxPeriodLock_organizationId_idx" ON "TaxPeriodLock"("organizationId");

-- CreateIndex
CREATE INDEX "TaxPeriodLock_periodStart_periodEnd_idx" ON "TaxPeriodLock"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "TaxPeriodLock_organizationId_periodStart_periodEnd_key" ON "TaxPeriodLock"("organizationId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "TaxPeriodLock" ADD CONSTRAINT "TaxPeriodLock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxPeriodLock" ADD CONSTRAINT "TaxPeriodLock_lockedByUserId_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
