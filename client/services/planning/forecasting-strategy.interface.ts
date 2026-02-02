/**
 * Forecasting Strategy Interface
 * 
 * Defines the contract for all forecasting algorithms.
 * Implements Strategy Pattern to allow pluggable forecasting methods
 * without hardcoding algorithm logic in the main service.
 */

import { ForecastMethod } from '@prisma/client';
import Decimal from 'decimal.js';

// Core interfaces for forecasting strategies
export interface HistoricalDataPoint {
  date: Date;
  demand: Decimal;
  productId: string;
  branchId?: string;
  customerSegment?: string;
  externalEvents?: ExternalEvent[];
}

export interface ExternalEvent {
  type: 'HOLIDAY' | 'ELECTION' | 'HARVEST' | 'WEATHER' | 'PROMOTION' | 'OTHER';
  name: string;
  date: Date;
  impact?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  magnitude?: number; // 0.0 - 1.0 scale
}

export interface ForecastCalculationInput {
  organizationId: string;
  productId: string;
  branchId?: string;
  customerSegmentId?: string;
  periodStart: Date;
  periodEnd: Date;
  granularity: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER';
  method: ForecastMethod;
  historicalData: HistoricalDataPoint[];
  externalEvents?: ExternalEvent[];
  parameters?: Record<string, any>; // Algorithm-specific parameters
}

export interface ConfidenceInterval {
  lower: Decimal;
  upper: Decimal;
  level: Decimal; // 0.95 for 95% confidence
}

export interface ForecastResult {
  forecastValue: Decimal;
  confidenceInterval?: ConfidenceInterval;
  confidence: Decimal; // 0.0 - 1.0 (0.85 = 85%)
  algorithm: string;
  parameters: Record<string, any>;
  metadata?: {
    seasonality?: {
      detected: boolean;
      period?: number; // months
      strength?: number; // 0.0 - 1.0
    };
    trend?: {
      direction: 'UP' | 'DOWN' | 'FLAT';
      strength: number; // 0.0 - 1.0
    };
    dataQuality?: {
      score: number; // 0.0 - 1.0
      gaps: number;
      outliers: number;
    };
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  minHistoryRequired: number; // months
  actualHistoryAvailable: number; // months
}

/**
 * Main strategy interface that all forecasting algorithms must implement
 */
export interface ForecastingStrategy {
  /**
   * Calculate forecast for the given input parameters
   */
  calculate(input: ForecastCalculationInput): Promise<ForecastResult>;
  
  /**
   * Validate input parameters for this strategy
   */
  validateInput(input: ForecastCalculationInput): ValidationResult;
  
  /**
   * Get minimum required history months for this algorithm
   */
  getRequiredHistoryMonths(): number;
  
  /**
   * Whether this strategy can provide confidence intervals
   */
  supportsConfidenceIntervals(): boolean;
  
  /**
   * Get algorithm-specific parameter definitions
   */
  getParameterDefinitions(): ParameterDefinition[];
  
  /**
   * Get human-readable description of this strategy
   */
  getDescription(): string;
  
  /**
   * Get method enum this strategy handles
   */
  getMethod(): ForecastMethod;
}

export interface ParameterDefinition {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  description: string;
  defaultValue: any;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    options?: string[]; // for select type
  };
}

/**
 * Base abstract class providing common functionality
 */
export abstract class BaseForecastingStrategy implements ForecastingStrategy {
  protected readonly method: ForecastMethod;
  protected readonly requiredHistoryMonths: number;
  
  constructor(method: ForecastMethod, requiredHistoryMonths: number = 12) {
    this.method = method;
    this.requiredHistoryMonths = requiredHistoryMonths;
  }
  
  abstract calculate(input: ForecastCalculationInput): Promise<ForecastResult>;
  
  validateInput(input: ForecastCalculationInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation
    if (!input.organizationId) errors.push('Organization ID is required');
    if (!input.productId) errors.push('Product ID is required');
    if (!input.periodStart) errors.push('Period start is required');
    if (!input.periodEnd) errors.push('Period end is required');
    
    // History validation
    const historyMonths = this.getHistoryMonths(input.historicalData);
    if (historyMonths < this.requiredHistoryMonths) {
      if (historyMonths < 3) {
        errors.push(`Insufficient history: ${historyMonths} months available, minimum ${this.requiredHistoryMonths} required`);
      } else {
        warnings.push(`Limited history: ${historyMonths} months available, ${this.requiredHistoryMonths} recommended`);
      }
    }
    
    // Data quality checks
    const gapCount = this.countDataGaps(input.historicalData);
    if (gapCount > historyMonths * 0.3) {
      warnings.push(`High data gaps: ${gapCount} gaps in ${historyMonths} months of history`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      minHistoryRequired: this.requiredHistoryMonths,
      actualHistoryAvailable: historyMonths,
    };
  }
  
  getRequiredHistoryMonths(): number {
    return this.requiredHistoryMonths;
  }
  
  supportsConfidenceIntervals(): boolean {
    return false; // Override in subclasses that support it
  }
  
  getMethod(): ForecastMethod {
    return this.method;
  }
  
  abstract getParameterDefinitions(): ParameterDefinition[];
  abstract getDescription(): string;
  
  // Helper methods
  protected getHistoryMonths(data: HistoricalDataPoint[]): number {
    if (data.length === 0) return 0;
    
    const sortedData = data.sort((a, b) => a.date.getTime() - b.date.getTime());
    const startDate = sortedData[0].date;
    const endDate = sortedData[sortedData.length - 1].date;
    
    const diffMonths = 
      (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
      (endDate.getMonth() - startDate.getMonth());
    
    return Math.max(1, diffMonths);
  }
  
  protected countDataGaps(data: HistoricalDataPoint[]): number {
    // Count expected vs actual data points
    if (data.length < 2) return 0;
    
    const sortedData = data.sort((a, b) => a.date.getTime() - b.date.getTime());
    const startDate = sortedData[0].date;
    const endDate = sortedData[sortedData.length - 1].date;
    
    const expectedMonths = this.getHistoryMonths(data);
    const actualMonths = sortedData.length;
    
    return Math.max(0, expectedMonths - actualMonths);
  }
  
  protected aggregateByMonth(data: HistoricalDataPoint[]): Map<string, Decimal> {
    const monthlyData = new Map<string, Decimal>();
    
    for (const point of data) {
      const monthKey = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || new Decimal(0);
      monthlyData.set(monthKey, existing.plus(point.demand));
    }
    
    return monthlyData;
  }
  
  protected detectSeasonality(data: HistoricalDataPoint[]): { detected: boolean; period?: number; strength?: number } {
    if (data.length < 24) return { detected: false };
    
    const monthlyData = this.aggregateByMonth(data);
    const values = Array.from(monthlyData.values()).map(d => d.toNumber());
    
    // Simple seasonality detection using coefficient of variation
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coeffVar = stdDev / mean;
    
    // If coefficient of variation > 0.3, likely seasonal
    const isSeasonalLikely = coeffVar > 0.3;
    
    return {
      detected: isSeasonalLikely,
      period: isSeasonalLikely ? 12 : undefined, // Assume annual seasonality
      strength: coeffVar,
    };
  }
  
  protected detectTrend(data: HistoricalDataPoint[]): { direction: 'UP' | 'DOWN' | 'FLAT'; strength: number } {
    if (data.length < 6) return { direction: 'FLAT', strength: 0 };
    
    const monthlyData = this.aggregateByMonth(data);
    const sortedKeys = Array.from(monthlyData.keys()).sort();
    const values = sortedKeys.map(key => monthlyData.get(key)!.toNumber());
    
    // Simple linear regression for trend
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i + 1);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;
    
    // Normalize slope by average value
    const normalizedSlope = slope / avgY;
    
    let direction: 'UP' | 'DOWN' | 'FLAT' = 'FLAT';
    if (Math.abs(normalizedSlope) > 0.01) { // 1% change per period
      direction = normalizedSlope > 0 ? 'UP' : 'DOWN';
    }
    
    return {
      direction,
      strength: Math.abs(normalizedSlope),
    };
  }
}

/**
 * Strategy Registry for managing forecasting algorithms
 */
export class ForecastingStrategyRegistry {
  private static instance: ForecastingStrategyRegistry;
  private strategies = new Map<ForecastMethod, ForecastingStrategy>();
  
  private constructor() {}
  
  static getInstance(): ForecastingStrategyRegistry {
    if (!ForecastingStrategyRegistry.instance) {
      ForecastingStrategyRegistry.instance = new ForecastingStrategyRegistry();
    }
    return ForecastingStrategyRegistry.instance;
  }
  
  register(strategy: ForecastingStrategy): void {
    this.strategies.set(strategy.getMethod(), strategy);
  }
  
  getStrategy(method: ForecastMethod): ForecastingStrategy | null {
    return this.strategies.get(method) || null;
  }
  
  getAllStrategies(): ForecastingStrategy[] {
    return Array.from(this.strategies.values());
  }
  
  getSupportedMethods(): ForecastMethod[] {
    return Array.from(this.strategies.keys());
  }
}