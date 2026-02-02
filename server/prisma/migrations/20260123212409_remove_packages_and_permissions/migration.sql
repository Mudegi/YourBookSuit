/*
  Warnings:

  - You are about to drop the column `permissions` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `package` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `OrganizationInvite` table. All the data in the column will be lost.
  - You are about to drop the column `permissions` on the `OrganizationUser` table. All the data in the column will be lost.
  - You are about to drop the `OrganizationUserRole` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RolePermission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrganizationInvite" DROP CONSTRAINT "OrganizationInvite_roleId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationUserRole" DROP CONSTRAINT "OrganizationUserRole_orgUserId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationUserRole" DROP CONSTRAINT "OrganizationUserRole_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationUserRole" DROP CONSTRAINT "OrganizationUserRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_roleId_fkey";

-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "permissions";

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "package";

-- AlterTable
ALTER TABLE "OrganizationInvite" DROP COLUMN "roleId";

-- AlterTable
ALTER TABLE "OrganizationUser" DROP COLUMN "permissions";

-- DropTable
DROP TABLE "OrganizationUserRole";

-- DropTable
DROP TABLE "Role";

-- DropTable
DROP TABLE "RolePermission";

-- DropEnum
DROP TYPE "PackageTier";

-- DropEnum
DROP TYPE "PermissionAction";

-- DropEnum
DROP TYPE "PermissionSection";
