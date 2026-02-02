/**
 * Enterprise Reorder Policy Strategy Interface
 * Supports swappable reorder policies for MRP/Supply Chain Planning
 */

export enum ReorderPolicyStrategy {
  FIXED_QTY = 'FIXED_QTY',                    // Always order a specific amount
  MAX_QTY = 'MAX_QTY',                        // Order to reach maximum level
  LOT_FOR_LOT = 'LOT_FOR_LOT',                // Order exactly what's needed
  ORDER_TO_ORDER = 'ORDER_TO_ORDER',          // One PO per sales order
  EOQ_BASED = 'EOQ_BASED',                    // Economic Order Quantity based
  PERIODIC_REVIEW = 'PERIODIC_REVIEW',        // Fixed review periods
}

export enum TimeBucket {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY', 
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface OrderModifiers {
  minOrderQty?: number;       // Minimum supplier will sell
  maxOrderQty?: number;       // Maximum we can store/afford
  orderMultiple?: number;     // Must order in multiples (e.g., packs of 12)
  leadTimeBufferDays?: number; // Regional buffer for logistics
  supplierPackSize?: number;   // Natural supplier packaging
}

export interface ReorderPolicyConfig {
  strategy: ReorderPolicyStrategy;
  timeBucket: TimeBucket;
  reorderPoint?: number;      // Trigger level
  maxLevel?: number;          // Ceiling for MAX_QTY strategy
  fixedOrderQty?: number;     // For FIXED_QTY strategy
  serviceLevel?: number;      // Target service level (95%, 98%)
  modifiers: OrderModifiers;
  
  // Organization context
  organizationId: string;
  productId: string;
  warehouseId?: string;
  categoryId?: string;        // For bulk assignment
}

export interface ReorderCalculationContext {
  currentStock: number;
  reservedStock: number;
  incomingStock: number;      // POs in transit
  demandForecast: number;     // Expected demand in review period
  avgDailyDemand: number;
  leadTimeDays: number;
  
  // Costs for EOQ calculation
  orderingCost?: number;      // Cost per purchase order
  holdingCostRate?: number;   // Annual holding cost %
  unitCost: number;          // Product cost in organization currency
  
  // Regional context
  countryCode: string;
  baseCurrency: string;
}

export interface ReorderRecommendation {
  strategy: ReorderPolicyStrategy;
  recommendedOrderQty: number;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasoning: string;
  financialImpact: {
    orderValue: number;            // Total order value
    formattedOrderValue: string;   // Formatted in org currency
    estimatedHoldingCost: number;  // Annual holding cost
    estimatedOrderingCost: number; // Cost of placing order
  };
  constraints: {
    appliedModifiers: OrderModifiers;
    constraintViolations: string[]; // Any issues with supplier constraints
  };
  nextReviewDate: Date;
}

/**
 * Core interface that all reorder policy strategies must implement
 */
export interface IReorderPolicyStrategy {
  readonly strategy: ReorderPolicyStrategy;
  readonly displayName: string;
  readonly description: string;
  
  /**
   * Calculate the recommended order quantity based on the strategy
   */
  calculateOrderQuantity(
    config: ReorderPolicyConfig,
    context: ReorderCalculationContext
  ): Promise<ReorderRecommendation>;
  
  /**
   * Validate if this strategy is applicable for the given product/warehouse
   */
  isApplicable(context: ReorderCalculationContext): boolean;
  
  /**
   * Get strategy-specific configuration requirements
   */
  getConfigurationSchema(): Record<string, any>;
}

/**
 * Localization Manager Interface for Regional Constraints
 */
export interface ILocalizationManager {
  /**
   * Get regional lead time buffer based on country logistics
   */
  getLeadTimeBuffer(countryCode: string): Promise<number>;
  
  /**
   * Get regional order size multipliers (e.g., shipping to East Africa)
   */
  getMinimumOrderMultiplier(countryCode: string): Promise<number>;
  
  /**
   * Get holding cost adjustments for different regions
   */
  getHoldingCostAdjustment(countryCode: string): Promise<number>;
  
  /**
   * Format currency amount using organization's locale
   */
  formatCurrency(amount: number, currencyCode: string, countryCode: string): Promise<string>;
}

/**
 * Policy Assignment Rules for Bulk Operations
 */
export interface PolicyAssignmentRule {
  id: string;
  name: string;
  description: string;
  
  // Assignment criteria
  applyToCategories?: string[];
  applyToWarehouses?: string[];
  applyToProductTypes?: string[];
  applyToSuppliers?: string[];
  
  // The policy to assign
  policyConfig: Omit<ReorderPolicyConfig, 'productId' | 'organizationId'>;
  
  // Scheduling
  isActive: boolean;
  priority: number; // Higher number = higher priority
  effectiveFrom: Date;
  effectiveTo?: Date;
}

/**
 * MRP Service Interface for Policy Integration
 */
export interface IMRPService {
  /**
   * Execute MRP run using configured reorder policies
   */
  executeMRPRun(organizationId: string, options?: {
    warehouseIds?: string[];
    productIds?: string[];
    planningHorizon?: number; // days
  }): Promise<{
    plannedOrders: Array<{
      productId: string;
      warehouseId: string;
      recommendedQty: number;
      dueDate: Date;
      strategy: ReorderPolicyStrategy;
      reasoning: string;
    }>;
    warnings: string[];
    summary: {
      totalRecommendations: number;
      totalValue: number;
      formattedTotalValue: string;
      highPriorityItems: number;
    };
  }>;
}

/**
 * Utility types for enterprise functionality
 */
export type PolicyAssignmentBulkOperation = {
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  assignmentRule: PolicyAssignmentRule;
  affectedProductCount: number;
  estimatedImpact: {
    orderingFrequencyChange: number; // % change in ordering frequency
    inventoryLevelChange: number;    // % change in average inventory
    costImpact: number;             // Financial impact per year
  };
};

export type ReorderPolicyAuditReport = {
  organizationId: string;
  generatedAt: Date;
  summary: {
    totalPolicies: number;
    activePolicies: number;
    strategiesInUse: Record<ReorderPolicyStrategy, number>;
    coverage: {
      productsWithPolicies: number;
      productsWithoutPolicies: number;
      warehousesCovered: number;
    };
  };
  recommendations: Array<{
    type: 'MISSING_POLICY' | 'OUTDATED_POLICY' | 'INEFFICIENT_STRATEGY' | 'CONSTRAINT_VIOLATION';
    productId: string;
    warehouseId?: string;
    message: string;
    suggestedAction: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  regionalCompliance: {
    countryCode: string;
    currency: string;
    localizationApplied: boolean;
    constraintsRespected: boolean;
    issues: string[];
  };
};