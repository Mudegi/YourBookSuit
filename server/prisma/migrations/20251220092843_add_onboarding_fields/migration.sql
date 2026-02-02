-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "industry" TEXT,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
