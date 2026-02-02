/**
 * Demand Sensing Service
 * 
 * Responsible for pulling historical sales data from the ERP system
 * and transforming it for forecasting algorithms with configurable localization.
 * 
 * Key capabilities:
 * - Extract 24+ months of InvoiceLine data
 * - Aggregate by different time periods (day, week, month, quarter)
 * - Detect seasonality patterns
 * - Account for external events through localization service (holidays, agricultural cycles, etc.)
 * - Data quality assessment and gap filling
 * - Multi-country support through configuration
 */

import { PrismaClient } from '@prisma/client';
import { subMonths, startOfMonth, endOfMonth, differenceInMonths } from 'date-fns';
import Decimal from 'decimal.js';
import {
  HistoricalDataPoint,
  ExternalEvent,
  ForecastCalculationInput,
} from './forecasting-strategy.interface';
import { LocalizationService } from './localization.service';

const prisma = new PrismaClient();

export interface DemandSensingRequest {
  organizationId: string;
  productId: string;
  branchId?: string;
  customerSegmentId?: string;
  endDate?: Date; // Default: now
  historyMonths?: number; // Default: 24
  granularity?: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER'; // Default: MONTH
  includeExternalEvents?: boolean; // Default: true
}

export interface SeasonalityPattern {
  detected: boolean;
  period?: number; // months (12 = annual, 3 = quarterly)
  strength?: number; // 0.0 - 1.0
  peaks?: number[]; // month numbers with highest demand
  troughs?: number[]; // month numbers with lowest demand
}

export interface DataQualityAssessment {
  totalPeriods: number;
  periodsWithData: number;
  gapPercentage: number;
  outlierCount: number;
  consistencyScore: number; // 0.0 - 1.0
  recommendations: string[];
}

export class DemandSensingService {
  private localizationService: LocalizationService;

  constructor() {
    this.localizationService = new LocalizationService();
  }

  /**
   * Get historical demand data from InvoiceLines
   * This is the primary entry point for demand sensing
   */
  async getHistoricalDemand(request: DemandSensingRequest): Promise<HistoricalDataPoint[]> {
    const {
      organizationId,
      productId,
      branchId,
      customerSegmentId,
      endDate = new Date(),
      historyMonths = 24,
      granularity = 'MONTH',
      includeExternalEvents = true,
    } = request;

    const startDate = subMonths(endDate, historyMonths);

    // Get invoice line data
    const invoiceLines = await prisma.invoiceLine.findMany({
      where: {
        productId,
        invoice: {
          organizationId,
          branchId: branchId || undefined,
          status: { in: ['SENT', 'PAID'] }, // Only completed sales
          invoiceDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        invoice: {
          select: {
            invoiceDate: true,
            branchId: true,
            customer: {
              select: {
                customerSegment: true,
              },
            },
          },
        },
      },
      orderBy: {
        invoice: {
          invoiceDate: 'asc',
        },
      },
    });

    // Filter by customer segment if specified
    let filteredLines = invoiceLines;
    if (customerSegmentId) {
      filteredLines = invoiceLines.filter(
        line => line.invoice.customer?.customerSegment === customerSegmentId
      );
    }

    // Aggregate by specified granularity
    const aggregatedData = this.aggregateByPeriod(filteredLines, granularity);

    // Add external events if requested
    let externalEvents: ExternalEvent[] = [];
    if (includeExternalEvents) {
      externalEvents = await this.getExternalEvents(
        organizationId,
        startDate,
        endDate
      );
    }

    // Create historical data points
    const dataPoints: HistoricalDataPoint[] = aggregatedData.map(point => ({
      date: point.date,
      demand: point.demand,
      productId,
      branchId,
      customerSegment: customerSegmentId,
      externalEvents: externalEvents.filter(event => 
        this.isEventInPeriod(event.date, point.date, granularity)
      ),
    }));

    return dataPoints;
  }

  /**
   * Aggregate invoice line data by time period
   */
  private aggregateByPeriod(
    invoiceLines: any[],
    granularity: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER'
  ): Array<{ date: Date; demand: Decimal }> {
    const aggregationMap = new Map<string, Decimal>();

    for (const line of invoiceLines) {
      const date = new Date(line.invoice.invoiceDate);
      const periodKey = this.getPeriodKey(date, granularity);
      
      const existing = aggregationMap.get(periodKey) || new Decimal(0);
      const quantity = new Decimal(line.quantity);
      aggregationMap.set(periodKey, existing.plus(quantity));
    }

    // Convert to array and sort by date
    const result = Array.from(aggregationMap.entries())
      .map(([periodKey, demand]) => ({
        date: this.parseperiodKey(periodKey, granularity),
        demand,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return result;
  }

  /**
   * Generate period key for aggregation
   */
  private getPeriodKey(date: Date, granularity: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER'): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-based month
    const day = date.getDate();

    switch (granularity) {
      case 'DAY':
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      case 'WEEK':
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      case 'MONTH':
        return `${year}-${String(month).padStart(2, '0')}`;
      case 'QUARTER':
        const quarter = Math.ceil(month / 3);
        return `${year}-Q${quarter}`;
      default:
        throw new Error(`Unsupported granularity: ${granularity}`);
    }
  }

  /**
   * Parse period key back to date
   */
  private parseperiodKey(periodKey: string, granularity: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER'): Date {
    switch (granularity) {
      case 'DAY':
        return new Date(periodKey);
      case 'WEEK':
        const [year, weekPart] = periodKey.split('-W');
        const weekNum = parseInt(weekPart);
        return this.getDateFromWeek(parseInt(year), weekNum);
      case 'MONTH':
        const [monthYear, monthNum] = periodKey.split('-');
        return new Date(parseInt(monthYear), parseInt(monthNum) - 1, 1);
      case 'QUARTER':
        const [qYear, quarterPart] = periodKey.split('-Q');
        const quarter = parseInt(quarterPart);
        return new Date(parseInt(qYear), (quarter - 1) * 3, 1);
      default:
        throw new Error(`Unsupported granularity: ${granularity}`);
    }
  }

  /**
   * Get week number of year
   */
  private getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  }

  /**
   * Get date from year and week number
   */
  private getDateFromWeek(year: number, week: number): Date {
    const startOfYear = new Date(year, 0, 1);
    const daysToAdd = (week - 1) * 7 - startOfYear.getDay() + 1;
    return new Date(year, 0, 1 + daysToAdd);
  }

  /**
   * Get external events using localization service
   */
  private async getExternalEvents(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExternalEvent[]> {
    try {
      const localizationEvents = await this.localizationService.getLocalizationEvents(
        organizationId,
        startDate,
        endDate
      );

      // Convert localization events to ExternalEvent format
      return localizationEvents.map(event => ({
        date: event.date,
        name: event.name,
        type: event.type,
        impact: event.impact,
        description: `${event.type}: ${event.name}`,
        category: event.affectedCategories.join(', ') || 'All',
      }));
    } catch (error) {
      console.error('Error loading external events:', error);
      return [];
    }
  }

  /**
   * Check if event falls within a period
   */
  private isEventInPeriod(
    eventDate: Date,
    periodDate: Date,
    granularity: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER'
  ): boolean {
    switch (granularity) {
      case 'DAY':
        return eventDate.toDateString() === periodDate.toDateString();
      case 'WEEK':
        const weekStart = new Date(periodDate);
        const weekEnd = new Date(periodDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return eventDate >= weekStart && eventDate <= weekEnd;
      case 'MONTH':
        return (
          eventDate.getFullYear() === periodDate.getFullYear() &&
          eventDate.getMonth() === periodDate.getMonth()
        );
      case 'QUARTER':
        const quarter = Math.ceil((periodDate.getMonth() + 1) / 3);
        const eventQuarter = Math.ceil((eventDate.getMonth() + 1) / 3);
        return (
          eventDate.getFullYear() === periodDate.getFullYear() &&
          eventQuarter === quarter
        );
      default:
        return false;
    }
  }

  /**
   * Detect seasonality patterns in historical data
   */
  async detectSeasonality(data: HistoricalDataPoint[]): Promise<SeasonalityPattern> {
    if (data.length < 12) {
      return { detected: false };
    }

    // Group by month
    const monthlyDemand = new Map<number, Decimal[]>();
    
    for (const point of data) {
      const month = point.date.getMonth() + 1; // 1-based month
      if (!monthlyDemand.has(month)) {
        monthlyDemand.set(month, []);
      }
      monthlyDemand.get(month)!.push(point.demand);
    }

    // Calculate average demand per month
    const monthlyAverages = new Map<number, number>();
    for (const [month, demands] of monthlyDemand.entries()) {
      const total = demands.reduce((sum, d) => sum.plus(d), new Decimal(0));
      const average = total.dividedBy(demands.length).toNumber();
      monthlyAverages.set(month, average);
    }

    // Calculate coefficient of variation to detect seasonality
    const values = Array.from(monthlyAverages.values());
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coeffVar = stdDev / mean;

    // Detect peaks and troughs
    const sortedMonths = Array.from(monthlyAverages.entries())
      .sort((a, b) => b[1] - a[1]); // Sort by demand desc

    const peaks = sortedMonths.slice(0, 2).map(([month]) => month); // Top 2 months
    const troughs = sortedMonths.slice(-2).map(([month]) => month); // Bottom 2 months

    return {
      detected: coeffVar > 0.2, // 20% variation indicates seasonality
      period: 12, // Assume annual seasonality
      strength: Math.min(1.0, coeffVar),
      peaks,
      troughs,
    };
  }

  /**
   * Assess data quality of historical demand
   */
  async assessDataQuality(data: HistoricalDataPoint[]): Promise<DataQualityAssessment> {
    if (data.length === 0) {
      return {
        totalPeriods: 0,
        periodsWithData: 0,
        gapPercentage: 100,
        outlierCount: 0,
        consistencyScore: 0,
        recommendations: ['No historical data available'],
      };
    }

    // Calculate expected vs actual periods
    const sortedData = data.sort((a, b) => a.date.getTime() - b.date.getTime());
    const startDate = sortedData[0].date;
    const endDate = sortedData[sortedData.length - 1].date;
    const expectedPeriods = differenceInMonths(endDate, startDate) + 1;
    const actualPeriods = data.length;
    const gapPercentage = Math.max(0, (expectedPeriods - actualPeriods) / expectedPeriods * 100);

    // Count outliers using IQR method
    const demands = data.map(d => d.demand.toNumber());
    const sorted = demands.slice().sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outlierCount = demands.filter(d => d < lowerBound || d > upperBound).length;

    // Calculate consistency score
    const mean = demands.reduce((sum, d) => sum + d, 0) / demands.length;
    const coeffVar = demands.length > 1 
      ? Math.sqrt(demands.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / demands.length) / mean 
      : 0;
    const consistencyScore = Math.max(0, Math.min(1, 1 - coeffVar));

    // Generate recommendations
    const recommendations: string[] = [];
    if (gapPercentage > 30) {
      recommendations.push('High data gaps detected. Consider data collection improvements.');
    }
    if (outlierCount > actualPeriods * 0.1) {
      recommendations.push('High number of outliers. Review data for errors or unusual events.');
    }
    if (consistencyScore < 0.5) {
      recommendations.push('High demand variability. Consider using advanced forecasting methods.');
    }
    if (actualPeriods < 12) {
      recommendations.push('Limited historical data. Accuracy may be reduced.');
    }

    return {
      totalPeriods: expectedPeriods,
      periodsWithData: actualPeriods,
      gapPercentage,
      outlierCount,
      consistencyScore,
      recommendations,
    };
  }

  /**
   * Create forecast input from demand sensing data
   */
  async prepareForecastInput(request: DemandSensingRequest): Promise<ForecastCalculationInput> {
    const historicalData = await this.getHistoricalDemand(request);
    
    return {
      organizationId: request.organizationId,
      productId: request.productId,
      branchId: request.branchId,
      customerSegmentId: request.customerSegmentId,
      periodStart: new Date(), // Next period start
      periodEnd: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000), // Next month
      granularity: request.granularity || 'MONTH',
      method: 'MOVING_AVERAGE' as any, // Will be overridden by caller
      historicalData,
      parameters: {},
    };
  }
}