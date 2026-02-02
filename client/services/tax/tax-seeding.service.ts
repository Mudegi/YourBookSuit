/**
 * Tax Seeding Service
 * 
 * Seeds tax agencies, rates, groups, and exemptions based on country templates
 */

import prisma from '@/lib/prisma';
import LocalizationManager, { CountryTaxTemplate } from './localization-manager.service';

export class TaxSeedingService {
  /**
   * Seed taxes for an organization based on their country
   */
  static async seedTaxesForOrganization(
    organizationId: string,
    countryCode: string
  ): Promise<{
    success: boolean;
    message: string;
    created: {
      agencies: number;
      rates: number;
      groups: number;
      exemptions: number;
    };
  }> {
    // Get template for country
    const template = LocalizationManager.getTaxTemplates(countryCode);

    if (!template) {
      return {
        success: false,
        message: `No tax template found for country code: ${countryCode}`,
        created: { agencies: 0, rates: 0, groups: 0, exemptions: 0 },
      };
    }

    const created = {
      agencies: 0,
      rates: 0,
      groups: 0,
      exemptions: 0,
    };

    try {
      // Create agencies and their rates
      for (const agencyTemplate of template.agencies) {
        // Check if agency already exists
        const existingAgency = await prisma.taxAgency.findFirst({
          where: {
            organizationId,
            code: agencyTemplate.code,
          },
        });

        let agency;
        if (existingAgency) {
          agency = existingAgency;
        } else {
          // Create new agency
          agency = await prisma.taxAgency.create({
            data: {
              organizationId,
              code: agencyTemplate.code,
              name: agencyTemplate.name,
              registrationNumber: agencyTemplate.registrationNumber,
              country: template.country,
              taxType: agencyTemplate.taxType as any,
              address: agencyTemplate.address,
              phone: agencyTemplate.phone,
              email: agencyTemplate.email,
              website: agencyTemplate.website,
              filingFrequency: agencyTemplate.filingFrequency,
            },
          });
          created.agencies++;
        }

        // Create rates for this agency
        for (const rateTemplate of agencyTemplate.rates) {
          // Check if rate already exists
          const existingRate = await prisma.taxAgencyRate.findFirst({
            where: {
              organizationId,
              taxAgencyId: agency.id,
              name: rateTemplate.name,
            },
          });

          if (!existingRate) {
            await prisma.taxAgencyRate.create({
              data: {
                organizationId,
                taxAgencyId: agency.id,
                name: rateTemplate.name,
                displayName: rateTemplate.displayName || rateTemplate.name,
                rate: rateTemplate.rate,
                isInclusiveDefault: rateTemplate.isInclusiveDefault,
                externalTaxCode: rateTemplate.externalTaxCode,
                reportingCategory: rateTemplate.reportingCategory,
                exemptionReasonCode: rateTemplate.exemptionReasonCode,
                effectiveFrom: rateTemplate.effectiveFrom,
                isDefault: rateTemplate.rate > 0 && rateTemplate.name.includes('Standard'),
              },
            });
            created.rates++;
          }
        }
      }

      // Create tax groups if provided
      if (template.groups) {
        for (const groupTemplate of template.groups) {
          // Check if group already exists
          const existingGroup = await prisma.taxGroup.findFirst({
            where: {
              organizationId,
              code: groupTemplate.code,
            },
          });

          if (!existingGroup) {
            // Find the agency for this group (use first agency by default)
            const agency = await prisma.taxAgency.findFirst({
              where: { organizationId },
            });

            const group = await prisma.taxGroup.create({
              data: {
                organizationId,
                taxAgencyId: agency?.id,
                name: groupTemplate.name,
                code: groupTemplate.code,
                description: groupTemplate.description,
                isDefault: groupTemplate.code === 'STD_VAT',
              },
            });

            // Create group rates
            for (const groupRate of groupTemplate.rates) {
              // Find the tax agency rate by name
              const taxAgencyRate = await prisma.taxAgencyRate.findFirst({
                where: {
                  organizationId,
                  name: groupRate.rateName,
                },
              });

              if (taxAgencyRate) {
                await prisma.taxGroupRate.create({
                  data: {
                    taxGroupId: group.id,
                    taxAgencyRateId: taxAgencyRate.id,
                    sequence: groupRate.sequence,
                    isCompound: groupRate.isCompound,
                  },
                });
              }
            }

            created.groups++;
          }
        }
      }

      // Create exemption reasons if provided
      if (template.exemptions) {
        for (const exemptionTemplate of template.exemptions) {
          // Check if exemption already exists
          const existingExemption = await prisma.taxExemptionReason.findFirst({
            where: {
              organizationId,
              code: exemptionTemplate.code,
            },
          });

          if (!existingExemption) {
            await prisma.taxExemptionReason.create({
              data: {
                organizationId,
                code: exemptionTemplate.code,
                name: exemptionTemplate.name,
                description: exemptionTemplate.description,
                category: exemptionTemplate.category,
                country: template.country,
                externalCode: exemptionTemplate.externalCode,
                requiresDocumentation: exemptionTemplate.requiresDocumentation,
              },
            });
            created.exemptions++;
          }
        }
      }

      return {
        success: true,
        message: `Successfully seeded taxes for ${template.countryName}`,
        created,
      };
    } catch (error) {
      console.error('Error seeding taxes:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        created,
      };
    }
  }

  /**
   * Get seeding status for an organization
   */
  static async getSeedingStatus(organizationId: string) {
    const agencies = await prisma.taxAgency.count({ where: { organizationId } });
    const rates = await prisma.taxAgencyRate.count({ where: { organizationId } });
    const groups = await prisma.taxGroup.count({ where: { organizationId } });
    const exemptions = await prisma.taxExemptionReason.count({ where: { organizationId } });

    return {
      isSeeded: agencies > 0 && rates > 0,
      counts: {
        agencies,
        rates,
        groups,
        exemptions,
      },
    };
  }

  /**
   * Re-seed taxes (careful: this will add new templates, not replace existing)
   */
  static async reseedTaxes(organizationId: string, countryCode: string) {
    return this.seedTaxesForOrganization(organizationId, countryCode);
  }
}

export default TaxSeedingService;
