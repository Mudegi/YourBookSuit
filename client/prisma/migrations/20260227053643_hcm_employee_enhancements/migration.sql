-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "bankBranch" TEXT,
ADD COLUMN     "bankSortCode" TEXT,
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "localDistrict" TEXT,
ADD COLUMN     "localParish" TEXT,
ADD COLUMN     "localRegion" TEXT,
ADD COLUMN     "localVillage" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "nextOfKinName" TEXT,
ADD COLUMN     "nextOfKinPhone" TEXT,
ADD COLUMN     "nextOfKinRelation" TEXT,
ADD COLUMN     "probationEndDate" TIMESTAMP(3),
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "socialSecurityNo" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateIndex
CREATE INDEX "Employee_branchId_idx" ON "Employee"("branchId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
