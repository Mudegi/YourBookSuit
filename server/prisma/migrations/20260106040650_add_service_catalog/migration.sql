/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,productId,costingVersion]` on the table `StandardCost` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('PROFESSIONAL', 'TECHNICAL', 'CREATIVE', 'EDUCATIONAL', 'SUPPORT', 'ADMINISTRATIVE', 'FIELD_SERVICE', 'DIGITAL', 'RESEARCH', 'PROJECT_BASED');

-- CreateEnum
CREATE TYPE "ServicePricingModel" AS ENUM ('FIXED_PRICE', 'HOURLY_RATE', 'DAILY_RATE', 'PROJECT_BASED', 'VALUE_BASED', 'RETAINER', 'SUBSCRIPTION', 'PER_USER', 'PER_TRANSACTION', 'TIERED');

-- CreateEnum
CREATE TYPE "ServiceSkillLevel" AS ENUM ('ENTRY_LEVEL', 'JUNIOR', 'STANDARD', 'SENIOR', 'EXPERT', 'SPECIALIST');

-- CreateEnum
CREATE TYPE "ServiceLocation" AS ENUM ('CLIENT_SITE', 'OUR_OFFICE', 'REMOTE', 'HYBRID', 'FIELD', 'WORKSHOP');

-- CreateEnum
CREATE TYPE "ServiceDeliveryMethod" AS ENUM ('ON_SITE', 'REMOTE', 'VIRTUAL', 'SELF_PACED', 'BLENDED', 'WORKSHOP', 'ONE_ON_ONE');

-- CreateEnum
CREATE TYPE "ServiceDeliveryStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'PENDING_APPROVAL');

-- CreateEnum
CREATE TYPE "ServiceBookingStatus" AS ENUM ('REQUESTED', 'PENDING_APPROVAL', 'CONFIRMED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ServiceWorkType" AS ENUM ('DELIVERY', 'PREPARATION', 'TRAVEL', 'ADMIN', 'FOLLOW_UP', 'QUALITY_ASSURANCE', 'CLIENT_COMMUNICATION');

-- CreateEnum
CREATE TYPE "ServiceResourceType" AS ENUM ('HUMAN', 'EQUIPMENT', 'FACILITY', 'DIGITAL', 'MATERIAL');

-- CreateEnum
CREATE TYPE "ResourceAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE', 'ON_LEAVE', 'OVERBOOKED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "StandardCostStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'FROZEN', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "StandardCost" ADD COLUMN     "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "bomId" TEXT,
ADD COLUMN     "costingVersion" TEXT NOT NULL DEFAULT '1.0',
ADD COLUMN     "isFrozen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastPurchasePrice" DECIMAL(19,4),
ADD COLUMN     "lastRollupDate" TIMESTAMP(3),
ADD COLUMN     "localizedCosts" JSONB,
ADD COLUMN     "priceDelta" DECIMAL(19,4),
ADD COLUMN     "priceVariance" DECIMAL(19,4),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "rollupSource" TEXT,
ADD COLUMN     "routingId" TEXT,
ADD COLUMN     "status" "StandardCostStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "validTo" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ServiceCatalog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceType" "ServiceType" NOT NULL DEFAULT 'PROFESSIONAL',
    "category" TEXT,
    "pricingModel" "ServicePricingModel" NOT NULL DEFAULT 'FIXED_PRICE',
    "unitOfMeasure" TEXT,
    "standardRate" DECIMAL(19,4),
    "standardDuration" INTEGER,
    "skillLevel" "ServiceSkillLevel" NOT NULL DEFAULT 'STANDARD',
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "autoScheduling" BOOLEAN NOT NULL DEFAULT false,
    "allowOnlineBooking" BOOLEAN NOT NULL DEFAULT false,
    "minimumBookingHours" INTEGER DEFAULT 1,
    "maximumBookingHours" INTEGER,
    "advanceBookingHours" INTEGER DEFAULT 24,
    "cancellationHours" INTEGER DEFAULT 24,
    "serviceUrl" TEXT,
    "serviceIcon" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceCatalogId" TEXT NOT NULL,
    "activityCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "estimatedHours" DECIMAL(8,2),
    "standardRate" DECIMAL(19,4),
    "skillRequired" "ServiceSkillLevel" NOT NULL DEFAULT 'STANDARD',
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isMilestone" BOOLEAN NOT NULL DEFAULT false,
    "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qualityChecks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOffering" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceCatalogId" TEXT NOT NULL,
    "offeringCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "packagePrice" DECIMAL(19,4) NOT NULL,
    "packageDuration" INTEGER NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 365,
    "maxParticipants" INTEGER,
    "location" "ServiceLocation" NOT NULL DEFAULT 'CLIENT_SITE',
    "deliveryMethod" "ServiceDeliveryMethod" NOT NULL DEFAULT 'ON_SITE',
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includedActivities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "materials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportPeriodDays" INTEGER DEFAULT 30,
    "warrantyPeriodDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDelivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceCatalogId" TEXT NOT NULL,
    "deliveryNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "projectId" TEXT,
    "bookingId" TEXT,
    "status" "ServiceDeliveryStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" "ServicePriority" NOT NULL DEFAULT 'MEDIUM',
    "plannedStartDate" TIMESTAMP(3) NOT NULL,
    "plannedEndDate" TIMESTAMP(3) NOT NULL,
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "assignedTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "clientContactName" TEXT,
    "clientContactEmail" TEXT,
    "clientContactPhone" TEXT,
    "estimatedHours" DECIMAL(8,2) NOT NULL,
    "actualHours" DECIMAL(8,2),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER,
    "customerSatisfaction" INTEGER,
    "notes" TEXT,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completionCriteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signOffRequired" BOOLEAN NOT NULL DEFAULT false,
    "signOffBy" TEXT,
    "signOffDate" TIMESTAMP(3),
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBooking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceCatalogId" TEXT,
    "offeringId" TEXT,
    "bookingNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "bookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "confirmedDate" TIMESTAMP(3),
    "status" "ServiceBookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "priority" "ServicePriority" NOT NULL DEFAULT 'MEDIUM',
    "location" TEXT,
    "specialRequests" TEXT,
    "estimatedHours" DECIMAL(8,2),
    "quotedPrice" DECIMAL(19,4),
    "approvedPrice" DECIMAL(19,4),
    "approvedBy" TEXT,
    "approvedDate" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancellationDate" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "paymentStatus" "PaymentStatus" DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceActivityEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "assignedTo" TEXT NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "qualityCheck" BOOLEAN NOT NULL DEFAULT false,
    "qualityNotes" TEXT,
    "blockers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completionNotes" TEXT,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientPresent" BOOLEAN NOT NULL DEFAULT false,
    "clientFeedback" TEXT,
    "billableHours" DECIMAL(8,2),
    "billableRate" DECIMAL(19,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceActivityEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTimeEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationHours" DECIMAL(8,2) NOT NULL,
    "description" TEXT NOT NULL,
    "workType" "ServiceWorkType" NOT NULL DEFAULT 'DELIVERY',
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "hourlyRate" DECIMAL(19,4),
    "totalAmount" DECIMAL(19,4),
    "approvedBy" TEXT,
    "approvedDate" TIMESTAMP(3),
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceResource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceCatalogId" TEXT NOT NULL,
    "resourceType" "ServiceResourceType" NOT NULL DEFAULT 'HUMAN',
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "availability" "ResourceAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "hourlyRate" DECIMAL(19,4),
    "utilizationTarget" INTEGER NOT NULL DEFAULT 80,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceCatalog_organizationId_serviceType_idx" ON "ServiceCatalog"("organizationId", "serviceType");

-- CreateIndex
CREATE INDEX "ServiceCatalog_organizationId_category_idx" ON "ServiceCatalog"("organizationId", "category");

-- CreateIndex
CREATE INDEX "ServiceCatalog_organizationId_isActive_idx" ON "ServiceCatalog"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalog_organizationId_serviceCode_key" ON "ServiceCatalog"("organizationId", "serviceCode");

-- CreateIndex
CREATE INDEX "ServiceActivity_serviceCatalogId_idx" ON "ServiceActivity"("serviceCatalogId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceActivity_organizationId_serviceCatalogId_activityCod_key" ON "ServiceActivity"("organizationId", "serviceCatalogId", "activityCode");

-- CreateIndex
CREATE INDEX "ServiceOffering_serviceCatalogId_idx" ON "ServiceOffering"("serviceCatalogId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOffering_organizationId_serviceCatalogId_offeringCod_key" ON "ServiceOffering"("organizationId", "serviceCatalogId", "offeringCode");

-- CreateIndex
CREATE INDEX "ServiceDelivery_organizationId_status_idx" ON "ServiceDelivery"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ServiceDelivery_serviceCatalogId_idx" ON "ServiceDelivery"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "ServiceDelivery_customerId_idx" ON "ServiceDelivery"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDelivery_organizationId_deliveryNumber_key" ON "ServiceDelivery"("organizationId", "deliveryNumber");

-- CreateIndex
CREATE INDEX "ServiceBooking_organizationId_status_idx" ON "ServiceBooking"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ServiceBooking_customerId_idx" ON "ServiceBooking"("customerId");

-- CreateIndex
CREATE INDEX "ServiceBooking_serviceCatalogId_idx" ON "ServiceBooking"("serviceCatalogId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBooking_organizationId_bookingNumber_key" ON "ServiceBooking"("organizationId", "bookingNumber");

-- CreateIndex
CREATE INDEX "ServiceActivityEntry_organizationId_deliveryId_idx" ON "ServiceActivityEntry"("organizationId", "deliveryId");

-- CreateIndex
CREATE INDEX "ServiceActivityEntry_activityId_idx" ON "ServiceActivityEntry"("activityId");

-- CreateIndex
CREATE INDEX "ServiceActivityEntry_assignedTo_idx" ON "ServiceActivityEntry"("assignedTo");

-- CreateIndex
CREATE INDEX "ServiceTimeEntry_organizationId_deliveryId_idx" ON "ServiceTimeEntry"("organizationId", "deliveryId");

-- CreateIndex
CREATE INDEX "ServiceTimeEntry_userId_idx" ON "ServiceTimeEntry"("userId");

-- CreateIndex
CREATE INDEX "ServiceTimeEntry_entryDate_idx" ON "ServiceTimeEntry"("entryDate");

-- CreateIndex
CREATE INDEX "ServiceResource_serviceCatalogId_idx" ON "ServiceResource"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "ServiceResource_resourceType_idx" ON "ServiceResource"("resourceType");

-- CreateIndex
CREATE INDEX "ServiceResource_availability_idx" ON "ServiceResource"("availability");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceResource_organizationId_serviceCatalogId_resourceId_key" ON "ServiceResource"("organizationId", "serviceCatalogId", "resourceId");

-- CreateIndex
CREATE INDEX "StandardCost_costingVersion_status_idx" ON "StandardCost"("costingVersion", "status");

-- CreateIndex
CREATE INDEX "StandardCost_status_approvalRequired_idx" ON "StandardCost"("status", "approvalRequired");

-- CreateIndex
CREATE UNIQUE INDEX "StandardCost_organizationId_productId_costingVersion_key" ON "StandardCost"("organizationId", "productId", "costingVersion");

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceActivity" ADD CONSTRAINT "ServiceActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceActivity" ADD CONSTRAINT "ServiceActivity_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDelivery" ADD CONSTRAINT "ServiceDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDelivery" ADD CONSTRAINT "ServiceDelivery_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDelivery" ADD CONSTRAINT "ServiceDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDelivery" ADD CONSTRAINT "ServiceDelivery_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ServiceBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceActivityEntry" ADD CONSTRAINT "ServiceActivityEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceActivityEntry" ADD CONSTRAINT "ServiceActivityEntry_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "ServiceDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceActivityEntry" ADD CONSTRAINT "ServiceActivityEntry_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ServiceActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTimeEntry" ADD CONSTRAINT "ServiceTimeEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTimeEntry" ADD CONSTRAINT "ServiceTimeEntry_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "ServiceDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTimeEntry" ADD CONSTRAINT "ServiceTimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceResource" ADD CONSTRAINT "ServiceResource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceResource" ADD CONSTRAINT "ServiceResource_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardCost" ADD CONSTRAINT "StandardCost_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "BillOfMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardCost" ADD CONSTRAINT "StandardCost_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "Routing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
