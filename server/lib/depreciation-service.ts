/**
 * Fixed Assets Depreciation Service
 * Handles depreciation calculations for various methods including Uganda tax rates
 */

import { PrismaClient, Prisma, DepreciationMethod } from '@prisma/client';
import { addMonths, differenceInMonths, format } from 'date-fns';

const prisma = new PrismaClient();

// Uganda Revenue Authority (URA) Tax Depreciation Rates
export const UGANDA_TAX_DEPRECIATION_RATES = {
  COMPUTERS_ELECTRONICS: 40, // 40% per year
  MOTOR_VEHICLES: 25, // 25% per year
  PLANT_MACHINERY: 30, // 30% per year
  FURNITURE_FITTINGS: 20, // 20% per year
  BUILDINGS_COMMERCIAL: 10, // 10% per year (straight line)
  BUILDINGS_INDUSTRIAL: 5, // 5% per year
};

export interface DepreciationCalculation {
  period: string;
  periodStartDate: Date;
  periodEndDate: Date;
  openingBookValue: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  closingBookValue: number;
  taxDepreciationAmount?: number;
  taxBookValue?: number;
}

/**
 * Calculate straight-line depreciation
 * Formula: (Cost - Salvage Value) / Useful Life
 */
export function calculateStraightLineDepreciation(
  cost: number,
  salvageValue: number,
  usefulLifeYears: number,
  monthsUsed: number
): number {
  const annualDepreciation = (cost - salvageValue) / usefulLifeYears;
  const monthlyDepreciation = annualDepreciation / 12;
  return monthlyDepreciation * monthsUsed;
}

/**
 * Calculate declining balance depreciation
 * Formula: Book Value * (Rate / 100)
 */
export function calculateDecliningBalanceDepreciation(
  bookValue: number,
  rate: number,
  monthsUsed: number
): number {
  const annualRate = rate / 100;
  const monthlyRate = annualRate / 12;
  return bookValue * monthlyRate * monthsUsed;
}

/**
 * Calculate double declining balance depreciation
 * Formula: Book Value * (2 / Useful Life)
 */
export function calculateDoubleDecliningDepreciation(
  bookValue: number,
  usefulLifeYears: number,
  monthsUsed: number
): number {
  const annualRate = 2 / usefulLifeYears;
  const monthlyRate = annualRate / 12;
  return bookValue * monthlyRate * monthsUsed;
}

/**
 * Calculate sum of years digits depreciation
 * Formula: (Cost - Salvage) * (Remaining Life / Sum of Years Digits)
 */
export function calculateSumOfYearsDepreciation(
  cost: number,
  salvageValue: number,
  usefulLifeYears: number,
  yearNumber: number,
  monthsInYear: number
): number {
  const depreciableBase = cost - salvageValue;
  const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
  const remainingYears = usefulLifeYears - yearNumber + 1;
  const annualDepreciation = (depreciableBase * remainingYears) / sumOfYears;
  return (annualDepreciation / 12) * monthsInYear;
}

/**
 * Calculate depreciation for a single period
 */
export async function calculatePeriodDepreciation(
  assetId: string,
  periodStartDate: Date,
  periodEndDate: Date
): Promise<DepreciationCalculation> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      category: true,
    },
  });

  if (!asset) {
    throw new Error(`Asset ${assetId} not found`);
  }

  if (asset.status !== 'ACTIVE') {
    throw new Error(`Cannot depreciate ${asset.status} asset`);
  }

  // Get previous depreciation to calculate opening book value
  const previousDepreciation = await prisma.assetDepreciation.findFirst({
    where: {
      assetId,
      periodEndDate: {
        lt: periodStartDate,
      },
    },
    orderBy: {
      periodEndDate: 'desc',
    },
  });

  const openingBookValue = previousDepreciation
    ? Number(previousDepreciation.closingBookValue)
    : Number(asset.purchasePrice);

  const accumulatedSoFar = previousDepreciation
    ? Number(previousDepreciation.accumulatedDepreciation)
    : 0;

  // Calculate months in this period
  const monthsInPeriod = differenceInMonths(periodEndDate, periodStartDate) + 1;

  let depreciationAmount = 0;

  // Calculate based on method
  switch (asset.depreciationMethod) {
    case 'STRAIGHT_LINE':
      depreciationAmount = calculateStraightLineDepreciation(
        Number(asset.purchasePrice),
        Number(asset.salvageValue),
        asset.usefulLifeYears,
        monthsInPeriod
      );
      break;

    case 'DECLINING_BALANCE':
      // Use category's default or 20%
      const rate = asset.category.ugandaTaxRate
        ? Number(asset.category.ugandaTaxRate)
        : 20;
      depreciationAmount = calculateDecliningBalanceDepreciation(
        openingBookValue,
        rate,
        monthsInPeriod
      );
      break;

    case 'DOUBLE_DECLINING':
      depreciationAmount = calculateDoubleDecliningDepreciation(
        openingBookValue,
        asset.usefulLifeYears,
        monthsInPeriod
      );
      break;

    case 'SUM_OF_YEARS':
      // Calculate which year of asset life we're in
      const monthsSincePurchase = differenceInMonths(
        periodStartDate,
        asset.depreciationStartDate
      );
      const yearNumber = Math.floor(monthsSincePurchase / 12) + 1;
      depreciationAmount = calculateSumOfYearsDepreciation(
        Number(asset.purchasePrice),
        Number(asset.salvageValue),
        asset.usefulLifeYears,
        yearNumber,
        monthsInPeriod
      );
      break;

    case 'UNITS_OF_PRODUCTION':
      // This would require production data - not implemented yet
      throw new Error('Units of production method requires production tracking');
  }

  // Don't depreciate below salvage value
  const maxDepreciation = openingBookValue - Number(asset.salvageValue);
  depreciationAmount = Math.min(depreciationAmount, Math.max(0, maxDepreciation));

  const accumulatedDepreciation = accumulatedSoFar + depreciationAmount;
  const closingBookValue = openingBookValue - depreciationAmount;

  // Calculate Uganda tax depreciation if applicable
  let taxDepreciationAmount: number | undefined;
  let taxBookValue: number | undefined;

  if (asset.category.ugandaTaxRate) {
    taxDepreciationAmount = calculateDecliningBalanceDepreciation(
      openingBookValue,
      Number(asset.category.ugandaTaxRate),
      monthsInPeriod
    );
    taxBookValue = openingBookValue - taxDepreciationAmount;
  }

  return {
    period: format(periodEndDate, 'yyyy-MM'),
    periodStartDate,
    periodEndDate,
    openingBookValue,
    depreciationAmount,
    accumulatedDepreciation,
    closingBookValue,
    taxDepreciationAmount,
    taxBookValue,
  };
}

/**
 * Generate depreciation schedule for entire asset life
 */
export async function generateDepreciationSchedule(
  assetId: string
): Promise<DepreciationCalculation[]> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { category: true },
  });

  if (!asset) {
    throw new Error(`Asset ${assetId} not found`);
  }

  const schedule: DepreciationCalculation[] = [];
  let currentDate = new Date(asset.depreciationStartDate);
  const endDate = addMonths(currentDate, asset.usefulLifeYears * 12);

  while (currentDate < endDate) {
    const periodStart = currentDate;
    const periodEnd = addMonths(currentDate, 1);
    periodEnd.setDate(0); // Last day of month

    const calculation = await calculatePeriodDepreciation(
      assetId,
      periodStart,
      periodEnd
    );

    schedule.push(calculation);

    // Stop if fully depreciated
    if (calculation.closingBookValue <= Number(asset.salvageValue)) {
      break;
    }

    currentDate = addMonths(currentDate, 1);
  }

  return schedule;
}

/**
 * Post depreciation entries to general ledger
 */
export async function postDepreciationToGL(
  assetId: string,
  period: string,
  userId: string
): Promise<string> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      category: true,
      organization: true,
    },
  });

  if (!asset) {
    throw new Error(`Asset ${assetId} not found`);
  }

  // Get depreciation record for this period
  const depreciation = await prisma.assetDepreciation.findUnique({
    where: {
      assetId_period: {
        assetId,
        period,
      },
    },
  });

  if (!depreciation) {
    throw new Error(`Depreciation record for period ${period} not found`);
  }

  if (depreciation.posted) {
    throw new Error(`Depreciation for period ${period} already posted`);
  }

  if (Number(depreciation.depreciationAmount) === 0) {
    throw new Error('Cannot post zero depreciation');
  }

  // Create GL transaction
  const transactionNumber = `DEP-${format(new Date(), 'yyyy-MM')}-${asset.assetNumber}`;

  const transaction = await prisma.transaction.create({
    data: {
      organizationId: asset.organizationId,
      branchId: asset.branchId,
      transactionNumber,
      transactionDate: depreciation.periodEndDate,
      transactionType: 'DEPRECIATION',
      referenceType: 'Asset',
      referenceId: assetId,
      description: `Depreciation - ${asset.name} - ${period}`,
      notes: `${asset.depreciationMethod} depreciation`,
      status: 'POSTED',
      createdById: userId,
      taxCategory: 'DEPRECIATION',
      taxAmount: depreciation.depreciationAmount,
    },
  });

  // Create ledger entries
  // Debit: Depreciation Expense
  await prisma.ledgerEntry.create({
    data: {
      transactionId: transaction.id,
      accountId: asset.category.expenseAccountId,
      entryType: 'DEBIT',
      amount: depreciation.depreciationAmount,
      amountInBase: depreciation.depreciationAmount,
      description: `Depreciation expense - ${asset.name}`,
    },
  });

  // Credit: Accumulated Depreciation
  await prisma.ledgerEntry.create({
    data: {
      transactionId: transaction.id,
      accountId: asset.category.depreciationAccountId,
      entryType: 'CREDIT',
      amount: depreciation.depreciationAmount,
      amountInBase: depreciation.depreciationAmount,
      description: `Accumulated depreciation - ${asset.name}`,
    },
  });

  // Update depreciation record
  await prisma.assetDepreciation.update({
    where: { id: depreciation.id },
    data: {
      posted: true,
      transactionId: transaction.id,
      postedDate: new Date(),
      postedBy: userId,
    },
  });

  // Update asset current book value
  await prisma.asset.update({
    where: { id: assetId },
    data: {
      currentBookValue: depreciation.closingBookValue,
      accumulatedDepreciation: depreciation.accumulatedDepreciation,
    },
  });

  return transaction.id;
}

/**
 * Run monthly depreciation for all active assets
 */
export async function runMonthlyDepreciation(
  organizationId: string,
  period: string // "2025-12"
): Promise<{
  success: boolean;
  assetsProcessed: number;
  totalDepreciation: number;
  errors: string[];
}> {
  const [year, month] = period.split('-').map(Number);
  const periodStartDate = new Date(year, month - 1, 1);
  const periodEndDate = new Date(year, month, 0); // Last day of month

  const assets = await prisma.asset.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      depreciationStartDate: {
        lte: periodEndDate,
      },
    },
  });

  const errors: string[] = [];
  let totalDepreciation = 0;
  let assetsProcessed = 0;

  for (const asset of assets) {
    try {
      // Check if already calculated for this period
      const existing = await prisma.assetDepreciation.findUnique({
        where: {
          assetId_period: {
            assetId: asset.id,
            period,
          },
        },
      });

      if (existing) {
        continue; // Skip if already calculated
      }

      // Calculate depreciation
      const calculation = await calculatePeriodDepreciation(
        asset.id,
        periodStartDate,
        periodEndDate
      );

      // Save depreciation record
      await prisma.assetDepreciation.create({
        data: {
          organizationId,
          assetId: asset.id,
          period,
          periodStartDate: calculation.periodStartDate,
          periodEndDate: calculation.periodEndDate,
          depreciationMethod: asset.depreciationMethod,
          openingBookValue: new Prisma.Decimal(calculation.openingBookValue),
          depreciationAmount: new Prisma.Decimal(calculation.depreciationAmount),
          accumulatedDepreciation: new Prisma.Decimal(calculation.accumulatedDepreciation),
          closingBookValue: new Prisma.Decimal(calculation.closingBookValue),
          taxDepreciationAmount: calculation.taxDepreciationAmount
            ? new Prisma.Decimal(calculation.taxDepreciationAmount)
            : null,
          taxBookValue: calculation.taxBookValue
            ? new Prisma.Decimal(calculation.taxBookValue)
            : null,
          calculationDetails: calculation as any,
        },
      });

      totalDepreciation += calculation.depreciationAmount;
      assetsProcessed++;
    } catch (error: any) {
      errors.push(`${asset.assetNumber}: ${error.message}`);
    }
  }

  return {
    success: errors.length === 0,
    assetsProcessed,
    totalDepreciation,
    errors,
  };
}

/**
 * Calculate asset disposal gain/loss
 */
export function calculateDisposalGainLoss(
  costAtDisposal: number,
  accDepAtDisposal: number,
  disposalPrice: number
): { gainLoss: number; gainLossType: 'GAIN' | 'LOSS' } {
  const bookValue = costAtDisposal - accDepAtDisposal;
  const gainLoss = disposalPrice - bookValue;

  return {
    gainLoss,
    gainLossType: gainLoss >= 0 ? 'GAIN' : 'LOSS',
  };
}
