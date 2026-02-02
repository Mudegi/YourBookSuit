/**
 * Main Forecasting Service
 * 
 * Orchestrates the entire demand forecasting process using the Strategy Pattern.
 * Integrates historical data analysis, algorithm selection, and result processing.
 * 
 * Key responsibilities:
 * - Strategy registration and management
 * - Forecast generation workflow
 * - Historical data integration via DemandSensingService
 * - Result validation and post-processing
 * - Multi-country localization through configurable localization service
 */

import { PrismaClient, ForecastMethod } from '@prisma/client';
import Decimal from 'decimal.js';
import {
  ForecastingStrategy,
  ForecastingStrategyRegistry,
  ForecastCalculationInput,
  ForecastResult,
  ValidationResult,
} from './forecasting-strategy.interface';
import {
  MovingAverageForecastingStrategy,
  ExponentialSmoothingForecastingStrategy,
  LinearRegressionForecastingStrategy,
} from './statistical-forecasting.strategies';
import {
  DemandSensingService,
  DemandSensingRequest,
} from './demand-sensing.service';
import { LocalizationService } from './localization.service';

const prisma = new PrismaClient();

export interface ForecastGenerationRequest {
  organizationId: string;
  productId: string;
  branchId?: string;
  warehouseId?: string;
  customerSegmentId?: string;
  scenarioId?: string;
  
  // Time parameters
  periodStart: Date;
  periodEnd: Date;
  granularity: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER';
  
  // Algorithm parameters
  method: ForecastMethod;
  parameters?: Record<string, any>;
  
  // History parameters
  historyMonths?: number;
  includeExternalEvents?: boolean;
  
  // Metadata
  notes?: string;
  userId: string;
}

export interface GeneratedForecast {
  forecastId: string;
  systemForecast: Decimal;
  confidenceLower?: Decimal;
  confidenceUpper?: Decimal;
  confidenceLevel: Decimal;
  algorithm: string;
  parameters: Record<string, any>;
  dataQualityScore: number;
  recommendations: string[];
  metadata: any;
}

export interface ForecastValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dataQuality: {
    score: number;
    issues: string[];
  };
}

/**
 * Main forecasting service implementing strategy pattern
 */
export class ForecastingService {
  private registry: ForecastingStrategyRegistry;
  private demandSensing: DemandSensingService;
  private localizationService: LocalizationService;
  
  constructor() {
    this.registry = ForecastingStrategyRegistry.getInstance();
    this.demandSensing = new DemandSensingService();
    this.localizationService = new LocalizationService();
    this.initializeStrategies();
  }
  
  /**
   * Register all available forecasting strategies
   */
  private initializeStrategies(): void {
    // Register statistical strategies
    this.registry.register(new MovingAverageForecastingStrategy());
    this.registry.register(new ExponentialSmoothingForecastingStrategy());
    this.registry.register(new LinearRegressionForecastingStrategy());
    
    // TODO: Register ML strategies when implemented
    // this.registry.register(new MachineLearningForecastingStrategy());
    // this.registry.register(new SeasonalForecastingStrategy());
  }
  
  /**
   * Generate a new demand forecast
   * Main entry point for forecast generation
   */
  async generateForecast(request: ForecastGenerationRequest): Promise<GeneratedForecast> {
    // 1. Validate request
    const validation = await this.validateRequest(request);
    if (!validation.isValid) {
      throw new Error(`Forecast validation failed: ${validation.errors.join(', ')}`);
    }
    
    // 2. Get strategy
    const strategy = this.registry.getStrategy(request.method);
    if (!strategy) {
      throw new Error(`No strategy found for method: ${request.method}`);
    }
    
    // 3. Gather historical data
    const demandRequest: DemandSensingRequest = {
      organizationId: request.organizationId,
      productId: request.productId,
      branchId: request.branchId,
      customerSegmentId: request.customerSegmentId,
      endDate: request.periodStart,
      historyMonths: request.historyMonths || strategy.getRequiredHistoryMonths(),
      granularity: request.granularity,
      includeExternalEvents: request.includeExternalEvents ?? true,
    };
    
    const historicalData = await this.demandSensing.getHistoricalDemand(demandRequest);
    
    // 4. Assess data quality
    const dataQualityAssessment = await this.demandSensing.assessDataQuality(historicalData);
    
    // 5. Prepare calculation input
    const calculationInput: ForecastCalculationInput = {
      organizationId: request.organizationId,
      productId: request.productId,
      branchId: request.branchId,
      customerSegmentId: request.customerSegmentId,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      granularity: request.granularity,
      method: request.method,
      historicalData,
      parameters: request.parameters || {},
    };
    
    // 6. Calculate forecast
    const result = await strategy.calculate(calculationInput);
    
    // 7. Create forecast record in database
    const forecastRecord = await this.createForecastRecord(request, result, dataQualityAssessment);
    
    // 8. Return generated forecast
    return {
      forecastId: forecastRecord.id,
      systemForecast: new Decimal(result.forecastValue),
      confidenceLower: result.confidenceInterval?.lower,
      confidenceUpper: result.confidenceInterval?.upper,
      confidenceLevel: new Decimal(result.confidence),
      algorithm: result.algorithm,
      parameters: result.parameters,
      dataQualityScore: dataQualityAssessment.consistencyScore,
      recommendations: [
        ...dataQualityAssessment.recommendations,
        ...validation.warnings,
      ],
      metadata: {
        ...result.metadata,
        dataQuality: dataQualityAssessment,
        validation: validation,
      },
    };
  }
  
  /**
   * Validate forecast generation request
   */
  private async validateRequest(request: ForecastGenerationRequest): Promise<ForecastValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation
    if (!request.organizationId) errors.push('Organization ID is required');
    if (!request.productId) errors.push('Product ID is required');
    if (!request.periodStart) errors.push('Period start is required');
    if (!request.periodEnd) errors.push('Period end is required');
    if (!request.userId) errors.push('User ID is required');
    
    // Verify organization exists
    if (request.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: request.organizationId },
      });
      if (!org) {
        errors.push('Organization not found');
      }
    }
    
    // Verify product exists
    if (request.productId) {
      const product = await prisma.product.findUnique({
        where: { id: request.productId },
      });
      if (!product) {
        errors.push('Product not found');
      }
    }
    
    // Verify method is supported
    const strategy = this.registry.getStrategy(request.method);
    if (!strategy) {
      errors.push(`Forecasting method '${request.method}' is not supported`);
    }
    
    // Period validation
    if (request.periodStart && request.periodEnd) {
      if (request.periodStart >= request.periodEnd) {
        errors.push('Period start must be before period end');
      }
    }
    
    // Data quality pre-assessment
    let dataQualityScore = 0;
    const dataIssues: string[] = [];
    
    if (strategy) {
      try {
        const demandRequest: DemandSensingRequest = {
          organizationId: request.organizationId,
          productId: request.productId,
          branchId: request.branchId,
          customerSegmentId: request.customerSegmentId,
          endDate: request.periodStart,
          historyMonths: request.historyMonths || strategy.getRequiredHistoryMonths(),
          granularity: request.granularity,
        };
        
        const historicalData = await this.demandSensing.getHistoricalDemand(demandRequest);
        const assessment = await this.demandSensing.assessDataQuality(historicalData);
        
        dataQualityScore = assessment.consistencyScore;
        dataIssues.push(...assessment.recommendations);
        
        if (assessment.gapPercentage > 50) {
          warnings.push('High data gaps may reduce forecast accuracy');
        }
        
        if (assessment.periodsWithData < strategy.getRequiredHistoryMonths()) {
          warnings.push(`Limited historical data (${assessment.periodsWithData} months), forecast accuracy may be reduced`);
        }
      } catch (error) {
        warnings.push('Unable to assess data quality during validation');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      dataQuality: {
        score: dataQualityScore,
        issues: dataIssues,
      },
    };
  }
  
  /**
   * Create forecast record in database
   */
  private async createForecastRecord(
    request: ForecastGenerationRequest,
    result: ForecastResult,
    dataQuality: any
  ): Promise<any> {
    // Create forecast with enhanced schema
    const forecast = await prisma.demandForecast.create({
      data: {
        organizationId: request.organizationId,
        productId: request.productId,
        warehouseId: request.warehouseId,
        forecastPeriod: this.formatPeriod(request.periodStart, request.granularity),
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        forecastMethod: request.method,
        
        // Current schema fields
        forecastedDemand: result.forecastValue,
        confidenceLevel: result.confidence,
        
        // Enhanced fields (will be added in schema update)
        // systemForecast: result.forecastValue,
        // consensusForecast: result.forecastValue, // Initially same as system
        // confidenceLower: result.confidenceInterval?.lower,
        // confidenceUpper: result.confidenceInterval?.upper,
        // status: 'DRAFT',
        // version: 1,
        
        notes: request.notes || `Generated using ${result.algorithm}`,
      },
    });
    
    // TODO: Create forecast metadata record
    // await prisma.forecastMetadata.create({
    //   data: {
    //     forecastId: forecast.id,
    //     algorithm: result.algorithm,
    //     parameters: result.parameters,
    //     dataQualityScore: dataQuality.consistencyScore,
    //     seasonalityDetected: result.metadata?.seasonality?.detected,
    //     trendDirection: result.metadata?.trend?.direction,
    //   },
    // });
    
    return forecast;
  }
  
  /**
   * Format period for display
   */
  private formatPeriod(date: Date, granularity: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER'): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    switch (granularity) {
      case 'DAY':
        return date.toISOString().split('T')[0];
      case 'WEEK':
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      case 'MONTH':
        return `${year}-${String(month).padStart(2, '0')}`;
      case 'QUARTER':
        const quarter = Math.ceil(month / 3);
        return `${year}-Q${quarter}`;
      default:
        return date.toISOString();
    }
  }
  
  /**
   * Get week number
   */
  private getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  }
  
  /**
   * Get available forecasting methods
   */
  getAvailableMethods(): Array<{ method: ForecastMethod; description: string; requiredHistory: number }> {
    return this.registry.getAllStrategies().map(strategy => ({
      method: strategy.getMethod(),
      description: strategy.getDescription(),
      requiredHistory: strategy.getRequiredHistoryMonths(),
    }));
  }
  
  /**
   * Get method recommendations based on data characteristics
   */
  async getMethodRecommendations(
    organizationId: string,
    productId: string,
    branchId?: string
  ): Promise<Array<{ method: ForecastMethod; score: number; reason: string }>> {
    try {
      // Get historical data for analysis
      const demandRequest: DemandSensingRequest = {
        organizationId,
        productId,
        branchId,
        historyMonths: 24,
        granularity: 'MONTH',
      };
      
      const historicalData = await this.demandSensing.getHistoricalDemand(demandRequest);
      const seasonality = await this.demandSensing.detectSeasonality(historicalData);
      const dataQuality = await this.demandSensing.assessDataQuality(historicalData);
      
      const recommendations = [];
      
      // Moving Average - good for stable demand
      let maScore = 0.6; // Base score
      if (!seasonality.detected) maScore += 0.2;
      if (dataQuality.consistencyScore > 0.7) maScore += 0.1;
      
      recommendations.push({
        method: ForecastMethod.MOVING_AVERAGE,
        score: Math.min(1.0, maScore),
        reason: 'Good for stable demand with minimal trend or seasonality',
      });
      
      // Exponential Smoothing - good for mild trends
      let esScore = 0.7; // Base score
      if (dataQuality.consistencyScore > 0.6) esScore += 0.1;
      if (seasonality.detected && seasonality.strength! < 0.5) esScore += 0.1;
      
      recommendations.push({
        method: ForecastMethod.EXPONENTIAL_SMOOTHING,
        score: Math.min(1.0, esScore),
        reason: 'Good for demand with mild trends and moderate seasonality',
      });
      
      // Linear Regression - good for clear trends
      let lrScore = 0.5; // Base score
      if (dataQuality.periodsWithData >= 12) lrScore += 0.2;
      if (dataQuality.consistencyScore < 0.5) lrScore += 0.2; // Good for trending data
      
      recommendations.push({
        method: ForecastMethod.LINEAR_REGRESSION,
        score: Math.min(1.0, lrScore),
        reason: 'Good for demand with clear upward or downward trends',
      });
      
      // Sort by score descending
      return recommendations.sort((a, b) => b.score - a.score);
      
    } catch (error) {
      console.error('Error generating method recommendations:', error);
      
      // Return default recommendations
      return [
        {
          method: ForecastMethod.EXPONENTIAL_SMOOTHING,
          score: 0.7,
          reason: 'Default recommendation - good balance of accuracy and stability',
        },
        {
          method: ForecastMethod.MOVING_AVERAGE,
          score: 0.6,
          reason: 'Simple and reliable for stable demand patterns',
        },
      ];
    }
  }
  
  /**
   * Batch generate forecasts for multiple products
   */
  async generateBatchForecasts(requests: ForecastGenerationRequest[]): Promise<GeneratedForecast[]> {
    const results: GeneratedForecast[] = [];
    
    for (const request of requests) {
      try {
        const forecast = await this.generateForecast(request);
        results.push(forecast);
      } catch (error) {
        console.error(`Failed to generate forecast for product ${request.productId}:`, error);
        // Continue with other products
      }
    }
    
    return results;
  }
  
  /**
   * Update existing forecast with manual adjustments
   */
  async updateForecastWithAdjustment(
    forecastId: string,
    adjustment: {
      manualAdjustment?: Decimal;
      adjustmentReason?: string;
      userId: string;
    }
  ): Promise<void> {
    // TODO: Implement with enhanced schema
    // await prisma.demandForecast.update({
    //   where: { id: forecastId },
    //   data: {
    //     manualAdjustment: adjustment.manualAdjustment,
    //     adjustmentReason: adjustment.adjustmentReason,
    //     consensusForecast: systemForecast.plus(manualAdjustment || 0),
    //   },
    // });
    
    // Create revision record
    // await prisma.forecastRevision.create({
    //   data: {
    //     forecastId,
    //     version: currentVersion + 1,
    //     changes: adjustment,
    //     changedBy: adjustment.userId,
    //     reason: adjustment.adjustmentReason,
    //   },
    // });
    
    console.log('Forecast adjustment saved:', { forecastId, adjustment });
  }
  
  /**
   * Get forecast accuracy metrics
   */
  async getForecastAccuracy(organizationId: string, productId?: string): Promise<{
    overallAccuracy: number;
    methodPerformance: Array<{ method: ForecastMethod; accuracy: number; count: number }>;
    recentTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  }> {
    // Get forecasts with actual demand data
    const forecasts = await prisma.demandForecast.findMany({
      where: {
        organizationId,
        productId: productId || undefined,
        actualDemand: { not: null },
        accuracy: { not: null },
      },
      select: {
        forecastMethod: true,
        accuracy: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Last 100 forecasts
    });
    
    if (forecasts.length === 0) {
      return {
        overallAccuracy: 0,
        methodPerformance: [],
        recentTrend: 'STABLE',
      };
    }
    
    // Calculate overall accuracy
    const totalAccuracy = forecasts.reduce((sum, f) => sum + Number(f.accuracy), 0);
    const overallAccuracy = totalAccuracy / forecasts.length;
    
    // Method performance
    const methodStats = new Map<ForecastMethod, { total: number; count: number }>();
    
    for (const forecast of forecasts) {
      const method = forecast.forecastMethod;
      const existing = methodStats.get(method) || { total: 0, count: 0 };
      methodStats.set(method, {
        total: existing.total + Number(forecast.accuracy),
        count: existing.count + 1,
      });
    }
    
    const methodPerformance = Array.from(methodStats.entries()).map(([method, stats]) => ({
      method,
      accuracy: stats.total / stats.count,
      count: stats.count,
    }));
    
    // Recent trend (last 10 vs previous 10)
    const recent10 = forecasts.slice(0, 10);
    const previous10 = forecasts.slice(10, 20);
    
    let recentTrend: 'IMPROVING' | 'DECLINING' | 'STABLE' = 'STABLE';
    
    if (recent10.length >= 5 && previous10.length >= 5) {
      const recentAvg = recent10.reduce((sum, f) => sum + Number(f.accuracy), 0) / recent10.length;
      const previousAvg = previous10.reduce((sum, f) => sum + Number(f.accuracy), 0) / previous10.length;
      
      const improvement = recentAvg - previousAvg;
      if (improvement > 0.05) recentTrend = 'IMPROVING';
      else if (improvement < -0.05) recentTrend = 'DECLINING';
    }
    
    return {
      overallAccuracy,
      methodPerformance: methodPerformance.sort((a, b) => b.accuracy - a.accuracy),
      recentTrend,
    };
  }
}