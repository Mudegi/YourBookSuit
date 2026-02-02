/**
 * Statistical Forecasting Strategies
 * 
 * Implements traditional statistical forecasting methods:
 * - Moving Average
 * - Exponential Smoothing 
 * - Linear Regression
 * - Seasonal decomposition
 */

import { ForecastMethod } from '@prisma/client';
import Decimal from 'decimal.js';
import {
  BaseForecastingStrategy,
  ForecastCalculationInput,
  ForecastResult,
  ParameterDefinition,
  ConfidenceInterval,
} from './forecasting-strategy.interface';

/**
 * Moving Average Strategy
 * Simple average of the last N periods
 */
export class MovingAverageForecastingStrategy extends BaseForecastingStrategy {
  constructor() {
    super(ForecastMethod.MOVING_AVERAGE, 6); // Need at least 6 months
  }
  
  async calculate(input: ForecastCalculationInput): Promise<ForecastResult> {
    const validation = this.validateInput(input);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Get parameters
    const periods = (input.parameters?.periods as number) || 3;
    
    // Aggregate data by month
    const monthlyData = this.aggregateByMonth(input.historicalData);
    const sortedKeys = Array.from(monthlyData.keys()).sort();
    const recentValues = sortedKeys
      .slice(-periods)
      .map(key => monthlyData.get(key)!)
      .map(d => d.toNumber());
    
    if (recentValues.length === 0) {
      throw new Error('No historical data available for calculation');
    }
    
    // Calculate moving average
    const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    // Simple confidence interval based on standard deviation
    const stdDev = Math.sqrt(
      recentValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / recentValues.length
    );
    const confidenceInterval: ConfidenceInterval = {
      lower: new Decimal(Math.max(0, average - 1.96 * stdDev)), // 95% CI
      upper: new Decimal(average + 1.96 * stdDev),
      level: new Decimal(0.95),
    };
    
    // Calculate confidence based on data consistency
    const coeffVar = stdDev / average;
    const confidence = Math.max(0.3, Math.min(0.95, 1 - coeffVar));
    
    // Detect patterns
    const seasonality = this.detectSeasonality(input.historicalData);
    const trend = this.detectTrend(input.historicalData);
    
    return {
      forecastValue: new Decimal(average),
      confidenceInterval,
      confidence: new Decimal(confidence),
      algorithm: 'Moving Average',
      parameters: { periods },
      metadata: {
        seasonality,
        trend,
        dataQuality: {
          score: confidence,
          gaps: this.countDataGaps(input.historicalData),
          outliers: this.countOutliers(recentValues),
        },
      },
    };
  }
  
  supportsConfidenceIntervals(): boolean {
    return true;
  }
  
  getParameterDefinitions(): ParameterDefinition[] {
    return [
      {
        name: 'periods',
        type: 'number',
        description: 'Number of historical periods to average',
        defaultValue: 3,
        required: false,
        validation: { min: 2, max: 12 },
      },
    ];
  }
  
  getDescription(): string {
    return 'Simple moving average of recent demand periods. Good for stable demand with minimal trend or seasonality.';
  }
  
  private countOutliers(values: number[]): number {
    if (values.length < 4) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(v => v < lowerBound || v > upperBound).length;
  }
}

/**
 * Exponential Smoothing Strategy
 * Weighted average with more weight on recent periods
 */
export class ExponentialSmoothingForecastingStrategy extends BaseForecastingStrategy {
  constructor() {
    super(ForecastMethod.EXPONENTIAL_SMOOTHING, 6);
  }
  
  async calculate(input: ForecastCalculationInput): Promise<ForecastResult> {
    const validation = this.validateInput(input);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Get parameters
    const alpha = (input.parameters?.alpha as number) || 0.3; // Smoothing parameter
    
    // Aggregate data by month
    const monthlyData = this.aggregateByMonth(input.historicalData);
    const sortedKeys = Array.from(monthlyData.keys()).sort();
    const values = sortedKeys.map(key => monthlyData.get(key)!.toNumber());
    
    if (values.length === 0) {
      throw new Error('No historical data available for calculation');
    }
    
    // Initialize with first value
    let smoothedValue = values[0];
    const smoothedSeries: number[] = [smoothedValue];
    
    // Apply exponential smoothing
    for (let i = 1; i < values.length; i++) {
      smoothedValue = alpha * values[i] + (1 - alpha) * smoothedValue;
      smoothedSeries.push(smoothedValue);
    }
    
    // Forecast is the last smoothed value
    const forecast = smoothedValue;
    
    // Calculate error measures for confidence
    const errors = values.slice(1).map((actual, i) => actual - smoothedSeries[i]);
    const mae = errors.reduce((sum, err) => sum + Math.abs(err), 0) / errors.length;
    const mse = errors.reduce((sum, err) => sum + err * err, 0) / errors.length;
    const rmse = Math.sqrt(mse);
    
    // Confidence interval based on forecast error
    const confidenceInterval: ConfidenceInterval = {
      lower: new Decimal(Math.max(0, forecast - 1.96 * rmse)),
      upper: new Decimal(forecast + 1.96 * rmse),
      level: new Decimal(0.95),
    };
    
    // Confidence based on forecast accuracy
    const mape = errors.reduce((sum, err, i) => {
      const actual = values[i + 1];
      return sum + (actual > 0 ? Math.abs(err / actual) : 0);
    }, 0) / errors.length;
    
    const confidence = Math.max(0.3, Math.min(0.95, 1 - mape));
    
    // Detect patterns
    const seasonality = this.detectSeasonality(input.historicalData);
    const trend = this.detectTrend(input.historicalData);
    
    return {
      forecastValue: new Decimal(forecast),
      confidenceInterval,
      confidence: new Decimal(confidence),
      algorithm: 'Exponential Smoothing',
      parameters: { alpha, mae, mse, rmse, mape },
      metadata: {
        seasonality,
        trend,
        dataQuality: {
          score: confidence,
          gaps: this.countDataGaps(input.historicalData),
          outliers: this.countOutliers(values),
        },
      },
    };
  }
  
  supportsConfidenceIntervals(): boolean {
    return true;
  }
  
  getParameterDefinitions(): ParameterDefinition[] {
    return [
      {
        name: 'alpha',
        type: 'number',
        description: 'Smoothing parameter (0-1). Higher values give more weight to recent data.',
        defaultValue: 0.3,
        required: false,
        validation: { min: 0.1, max: 0.9 },
      },
    ];
  }
  
  getDescription(): string {
    return 'Exponential smoothing gives more weight to recent periods. Good for demand with mild trend but no strong seasonality.';
  }
  
  private countOutliers(values: number[]): number {
    if (values.length < 4) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );
    
    // Points beyond 2 standard deviations are outliers
    return values.filter(v => Math.abs(v - mean) > 2 * stdDev).length;
  }
}

/**
 * Linear Regression Strategy
 * Fits a linear trend line to historical data
 */
export class LinearRegressionForecastingStrategy extends BaseForecastingStrategy {
  constructor() {
    super(ForecastMethod.LINEAR_REGRESSION, 12); // Need at least 12 months for trend
  }
  
  async calculate(input: ForecastCalculationInput): Promise<ForecastResult> {
    const validation = this.validateInput(input);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Aggregate data by month
    const monthlyData = this.aggregateByMonth(input.historicalData);
    const sortedKeys = Array.from(monthlyData.keys()).sort();
    const values = sortedKeys.map(key => monthlyData.get(key)!.toNumber());
    
    if (values.length < 3) {
      throw new Error('Need at least 3 data points for linear regression');
    }
    
    // Prepare X values (time periods)
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i + 1);
    
    // Calculate linear regression coefficients
    const sumX = x.reduce((sum, xi) => sum + xi, 0);
    const sumY = values.reduce((sum, yi) => sum + yi, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate forecast for next period
    const nextPeriod = n + 1;
    const forecast = intercept + slope * nextPeriod;
    
    // Calculate error measures
    const predictions = x.map(xi => intercept + slope * xi);
    const errors = values.map((actual, i) => actual - predictions[i]);
    const rmse = Math.sqrt(errors.reduce((sum, err) => sum + err * err, 0) / n);
    
    // Coefficient of determination (R²)
    const yMean = sumY / n;
    const ssTot = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssRes = errors.reduce((sum, err) => sum + err * err, 0);
    const rSquared = 1 - (ssRes / ssTot);
    
    // Confidence interval
    const confidenceInterval: ConfidenceInterval = {
      lower: new Decimal(Math.max(0, forecast - 1.96 * rmse)),
      upper: new Decimal(forecast + 1.96 * rmse),
      level: new Decimal(0.95),
    };
    
    // Confidence based on R²
    const confidence = Math.max(0.3, Math.min(0.95, rSquared));
    
    // Detect patterns
    const seasonality = this.detectSeasonality(input.historicalData);
    const trend = this.detectTrend(input.historicalData);
    
    return {
      forecastValue: new Decimal(Math.max(0, forecast)), // Ensure non-negative
      confidenceInterval,
      confidence: new Decimal(confidence),
      algorithm: 'Linear Regression',
      parameters: {
        slope,
        intercept,
        rSquared,
        rmse,
        correlation: this.calculateCorrelation(x, values),
      },
      metadata: {
        seasonality,
        trend,
        dataQuality: {
          score: confidence,
          gaps: this.countDataGaps(input.historicalData),
          outliers: this.countOutliers(values),
        },
      },
    };
  }
  
  supportsConfidenceIntervals(): boolean {
    return true;
  }
  
  getParameterDefinitions(): ParameterDefinition[] {
    return [
      {
        name: 'includeSeasonality',
        type: 'boolean',
        description: 'Whether to account for seasonal patterns in the regression',
        defaultValue: false,
        required: false,
      },
    ];
  }
  
  getDescription(): string {
    return 'Linear regression fits a trend line to historical data. Best for demand with clear upward or downward trends.';
  }
  
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, xi) => sum + xi, 0);
    const sumY = y.reduce((sum, yi) => sum + yi, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
  
  private countOutliers(values: number[]): number {
    // Use regression residuals to identify outliers
    if (values.length < 4) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i + 1);
    
    // Recalculate regression for outlier detection
    const sumX = x.reduce((sum, xi) => sum + xi, 0);
    const sumY = values.reduce((sum, yi) => sum + yi, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const residuals = values.map((yi, i) => Math.abs(yi - (intercept + slope * (i + 1))));
    const residualMean = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
    const residualStdDev = Math.sqrt(
      residuals.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) / residuals.length
    );
    
    // Points with residuals > 2 standard deviations are outliers
    return residuals.filter(r => r > residualMean + 2 * residualStdDev).length;
  }
}