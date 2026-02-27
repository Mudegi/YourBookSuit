-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "halfDayPeriod" TEXT,
ADD COLUMN     "isHalfDay" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN     "maxCarryForward" DECIMAL(8,2),
ADD COLUMN     "requiresAttachment" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest"("startDate", "endDate");
