/**
 * Branch Settings Service
 * Handles inheritance of organization settings to branches
 */

import prisma from '@/lib/prisma';

export interface BranchSettings {
  // Inherited from Organization
  baseCurrency: string;
  fiscalYearStart: number;
  homeCountry: string;
  taxIdNumber?: string;
  address?: string;
  phone?: string;
  email?: string;

  // Branch-specific (can override)
  branchCurrency?: string;
  branchTaxIdNumber?: string;
  branchAddress?: string;
  branchPhone?: string;
  branchEmail?: string;

  // Computed effective values
  effectiveCurrency: string;
  effectiveTaxIdNumber?: string;
  effectiveAddress?: string;
  effectivePhone?: string;
  effectiveEmail?: string;
}

export class BranchSettingsService {
  /**
   * Get effective settings for a branch, with organization fallbacks
   */
  static async getBranchSettings(branchId: string): Promise<BranchSettings> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { organization: true },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    const org = branch.organization;

    // Build effective settings with inheritance
    const settings: BranchSettings = {
      // Organization defaults
      baseCurrency: org.baseCurrency,
      fiscalYearStart: org.fiscalYearStart,
      homeCountry: org.homeCountry,
      taxIdNumber: org.taxIdNumber || undefined,
      address: org.address || undefined,
      phone: org.phone || undefined,
      email: org.email || undefined,

      // Branch overrides
      branchCurrency: branch.currency !== org.baseCurrency ? branch.currency : undefined,
      branchTaxIdNumber: branch.taxIdNumber,
      branchAddress: branch.address,
      branchPhone: branch.phone,
      branchEmail: branch.email,

      // Effective values (branch overrides or org defaults)
      effectiveCurrency: branch.currency,
      effectiveTaxIdNumber: branch.taxIdNumber || org.taxIdNumber || undefined,
      effectiveAddress: branch.address || org.address || undefined,
      effectivePhone: branch.phone || org.phone || undefined,
      effectiveEmail: branch.email || org.email || undefined,
    };

    return settings;
  }

  /**
   * Get all branches with their effective settings
   */
  static async getBranchesWithSettings(organizationId: string): Promise<any[]> {
    const branches = await prisma.branch.findMany({
      where: { organizationId },
      include: { organization: true },
    });

    return branches.map(branch => {
      const org = branch.organization;
      return {
        ...branch,
        effectiveSettings: {
          currency: branch.currency,
          taxIdNumber: branch.taxIdNumber || org.taxIdNumber,
          address: branch.address || org.address,
          phone: branch.phone || org.phone,
          email: branch.email || org.email,
        },
      };
    });
  }

  /**
   * Validate branch creation - ensure only one headquarters
   */
  static async validateBranchCreation(organizationId: string, isHeadquarters: boolean): Promise<void> {
    if (isHeadquarters) {
      const existingHQ = await prisma.branch.findFirst({
        where: {
          organizationId,
          isHeadquarters: true,
        },
      });

      if (existingHQ) {
        throw new Error('An organization can only have one headquarters branch');
      }
    }
  }

  /**
   * Validate branch update - prevent changing headquarters if it's the only one
   */
  static async validateBranchUpdate(branchId: string, updates: any): Promise<void> {
    if (updates.isHeadquarters === false) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: { organization: { include: { branches: true } } },
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      const hqCount = branch.organization.branches.filter(b => b.isHeadquarters).length;

      if (hqCount <= 1) {
        throw new Error('Cannot remove headquarters status - organization must have at least one headquarters');
      }
    }
  }

  /**
   * Validate branch deletion - prevent deleting headquarters
   */
  static async validateBranchDeletion(branchId: string): Promise<void> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { organization: { include: { branches: true } } },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    if (branch.isHeadquarters) {
      const hqCount = branch.organization.branches.filter(b => b.isHeadquarters).length;

      if (hqCount <= 1) {
        throw new Error('Cannot delete the headquarters branch - organization must have at least one headquarters');
      }
    }
  }
}