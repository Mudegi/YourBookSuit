/**
 * Business Model Classification System
 * 
 * Similar to QuickBooks, this module provides business model classification
 * to customize the ERP experience based on whether a business sells:
 * - Products only (inventory-based)
 * - Services only (time/expertise-based) 
 * - Both products and services (hybrid)
 */

export type BusinessModel = 'PRODUCT_ONLY' | 'SERVICE_ONLY' | 'PRODUCT_AND_SERVICE';

export type IndustryCategory = 
  | 'PROFESSIONAL_SERVICES'    // Consulting, Legal, Accounting, etc.
  | 'CREATIVE_SERVICES'        // Design, Marketing, Photography, etc.
  | 'TECHNICAL_SERVICES'       // IT Services, Software Development, etc.
  | 'RETAIL'                   // Selling physical products
  | 'MANUFACTURING'            // Creating and selling products
  | 'HOSPITALITY'              // Hotels, Restaurants, etc.
  | 'HEALTHCARE'               // Medical, Dental, etc.
  | 'CONSTRUCTION'             // Building, Contracting, etc.
  | 'REAL_ESTATE'              // Property management, Sales, etc.
  | 'NONPROFIT'                // Non-profit organizations
  | 'TECHNOLOGY'               // Tech companies, SaaS, etc.
  | 'MIXED'                    // Mixed products and services
  | 'ENTERPRISE'               // Large enterprise / full-featured
  | 'GENERAL';                 // Mixed or other

export interface BusinessModelProfile {
  model: BusinessModel;
  category: IndustryCategory;
  
  // Feature enablements based on business model
  features: {
    // Inventory & Products
    enableInventoryManagement: boolean;
    enableBillOfMaterials: boolean;
    enableManufacturing: boolean;
    enableProductCatalog: boolean;
    enableWarehouse: boolean;
    enablePurchaseOrders: boolean;
    
    // Services
    enableServiceCatalog: boolean;
    enableTimeTracking: boolean;
    enableProjectManagement: boolean;
    enableFieldService: boolean;
    
    // Common features (always available)
    enableInvoicing: boolean;
    enableExpenseTracking: boolean;
    enableFinancialReporting: boolean;
    enableCustomers: boolean;
    enableVendors: boolean;
  };
  
  // Navigation customization
  primaryModules: string[];
  secondaryModules: string[];
  hiddenModules: string[];
}

// Pre-defined business model profiles
export const BUSINESS_MODEL_PROFILES: Record<string, BusinessModelProfile> = {
  // Service-based businesses (like QuickBooks Simple Start for services)
  CONSULTING: {
    model: 'SERVICE_ONLY',
    category: 'PROFESSIONAL_SERVICES',
    features: {
      enableInventoryManagement: true,
      enableBillOfMaterials: false,
      enableManufacturing: false,
      enableProductCatalog: true,
      enableWarehouse: true,
      enablePurchaseOrders: true,
      enableServiceCatalog: true,
      enableTimeTracking: true,
      enableProjectManagement: true,
      enableFieldService: false,
      enableInvoicing: true,
      enableExpenseTracking: true,
      enableFinancialReporting: true,
      enableCustomers: true,
      enableVendors: true,
    },
    primaryModules: ['dashboard', 'customers', 'services', 'invoices', 'inventory', 'expenses', 'reports'],
    secondaryModules: ['projects', 'time-tracking', 'vendors', 'settings'],
    hiddenModules: ['manufacturing', 'bills-of-material'],
  },

  FREELANCE: {
    model: 'SERVICE_ONLY',
    category: 'CREATIVE_SERVICES',
    features: {
      enableInventoryManagement: true,
      enableBillOfMaterials: false,
      enableManufacturing: false,
      enableProductCatalog: true,
      enableWarehouse: true,
      enablePurchaseOrders: true,
      enableServiceCatalog: true,
      enableTimeTracking: true,
      enableProjectManagement: true,
      enableFieldService: false,
      enableInvoicing: true,
      enableExpenseTracking: true,
      enableFinancialReporting: true,
      enableCustomers: true,
      enableVendors: true,
    },
    primaryModules: ['dashboard', 'customers', 'services', 'invoices', 'inventory', 'expenses'],
    secondaryModules: ['projects', 'time-tracking', 'reports', 'vendors', 'settings'],
    hiddenModules: ['manufacturing', 'bills-of-material'],
  },

  // Product-based businesses (traditional inventory-focused)
  RETAIL: {
    model: 'PRODUCT_ONLY',
    category: 'RETAIL',
    features: {
      enableInventoryManagement: true,
      enableBillOfMaterials: false,
      enableManufacturing: false,
      enableProductCatalog: true,
      enableWarehouse: true,
      enablePurchaseOrders: true,
      enableServiceCatalog: true,
      enableTimeTracking: true,
      enableProjectManagement: true,
      enableFieldService: false,
      enableInvoicing: true,
      enableExpenseTracking: true,
      enableFinancialReporting: true,
      enableCustomers: true,
      enableVendors: true,
    },
    primaryModules: ['dashboard', 'inventory', 'customers', 'invoices', 'services', 'purchase-orders', 'vendors'],
    secondaryModules: ['warehouse', 'projects', 'time-tracking', 'expenses', 'reports', 'settings'],
    hiddenModules: ['manufacturing', 'bills-of-material'],
  },

  MANUFACTURER: {
    model: 'PRODUCT_ONLY',
    category: 'MANUFACTURING',
    features: {
      enableInventoryManagement: true,
      enableBillOfMaterials: true,
      enableManufacturing: true,
      enableProductCatalog: true,
      enableWarehouse: true,
      enablePurchaseOrders: true,
      enableServiceCatalog: true,
      enableTimeTracking: true,
      enableProjectManagement: true,
      enableFieldService: false,
      enableInvoicing: true,
      enableExpenseTracking: true,
      enableFinancialReporting: true,
      enableCustomers: true,
      enableVendors: true,
    },
    primaryModules: ['dashboard', 'manufacturing', 'inventory', 'customers', 'invoices', 'services', 'purchase-orders'],
    secondaryModules: ['warehouse', 'projects', 'time-tracking', 'vendors', 'expenses', 'reports', 'settings'],
    hiddenModules: [],
  },

  // Mixed businesses (both products and services)
  CONSTRUCTION: {
    model: 'PRODUCT_AND_SERVICE',
    category: 'CONSTRUCTION',
    features: {
      enableInventoryManagement: true,
      enableBillOfMaterials: false,
      enableManufacturing: false,
      enableProductCatalog: true,
      enableWarehouse: true,
      enablePurchaseOrders: true,
      enableServiceCatalog: true,
      enableTimeTracking: true,
      enableProjectManagement: true,
      enableFieldService: true,
      enableInvoicing: true,
      enableExpenseTracking: true,
      enableFinancialReporting: true,
      enableCustomers: true,
      enableVendors: true,
    },
    primaryModules: ['dashboard', 'projects', 'customers', 'invoices', 'inventory', 'services'],
    secondaryModules: ['time-tracking', 'field-service', 'purchase-orders', 'vendors', 'warehouse'],
    hiddenModules: ['manufacturing'],
  },

  TECHNOLOGY: {
    model: 'PRODUCT_AND_SERVICE',
    category: 'TECHNOLOGY',
    features: {
      enableInventoryManagement: true,
      enableBillOfMaterials: false,
      enableManufacturing: false,
      enableProductCatalog: true,
      enableWarehouse: true,
      enablePurchaseOrders: true,
      enableServiceCatalog: true,
      enableTimeTracking: true,
      enableProjectManagement: true,
      enableFieldService: false,
      enableInvoicing: true,
      enableExpenseTracking: true,
      enableFinancialReporting: true,
      enableCustomers: true,
      enableVendors: true,
    },
    primaryModules: ['dashboard', 'customers', 'services', 'invoices', 'inventory', 'projects'],
    secondaryModules: ['time-tracking', 'vendors', 'expenses', 'warehouse', 'purchase-orders', 'reports', 'settings'],
    hiddenModules: ['manufacturing', 'bills-of-material', 'field-service'],
  },

  // Mixed businesses (products AND services)
  MIXED_BUSINESS: {
    model: 'PRODUCT_AND_SERVICE',
    category: 'MIXED',
    features: {
      enableInventoryManagement: true,
      enableBillOfMaterials: true,
      enableManufacturing: true,
      enableProductCatalog: true,
      enableWarehouse: true,
      enablePurchaseOrders: true,
      enableServiceCatalog: true,
      enableTimeTracking: true,
      enableProjectManagement: true,
      enableFieldService: true,
      enableInvoicing: true,
      enableExpenseTracking: true,
      enableFinancialReporting: true,
      enableCustomers: true,
      enableVendors: true,
    },
    primaryModules: ['dashboard', 'customers', 'invoices', 'inventory', 'services', 'projects'],
    secondaryModules: ['manufacturing', 'warehouse', 'vendors', 'time-tracking', 'expenses', 'reports'],
    hiddenModules: [],
  },

  // Full-featured (for testing and comprehensive businesses)
  FULL_FEATURED: {
    model: 'ENTERPRISE',
    category: 'ENTERPRISE',
    features: {
      enableInventoryManagement: true,
      enableBillOfMaterials: true,
      enableManufacturing: true,
      enableProductCatalog: true,
      enableWarehouse: true,
      enablePurchaseOrders: true,
      enableServiceCatalog: true,
      enableTimeTracking: true,
      enableProjectManagement: true,
      enableFieldService: true,
      enableInvoicing: true,
      enableExpenseTracking: true,
      enableFinancialReporting: true,
      enableCustomers: true,
      enableVendors: true,
    },
    primaryModules: ['dashboard', 'customers', 'invoices', 'inventory', 'services', 'projects'],
    secondaryModules: ['manufacturing', 'warehouse', 'vendors', 'time-tracking', 'field-service', 'expenses', 'reports', 'crm'],
    hiddenModules: [],
  },

  // Fallback for existing organizations
  GENERAL: {
    model: 'PRODUCT_AND_SERVICE',
    category: 'GENERAL',
    features: {
      enableInventoryManagement: true,
      enableBillOfMaterials: true,
      enableManufacturing: true,
      enableProductCatalog: true,
      enableWarehouse: true,
      enablePurchaseOrders: true,
      enableServiceCatalog: true,
      enableTimeTracking: true,
      enableProjectManagement: true,
      enableFieldService: true,
      enableInvoicing: true,
      enableExpenseTracking: true,
      enableFinancialReporting: true,
      enableCustomers: true,
      enableVendors: true,
    },
    primaryModules: ['dashboard', 'customers', 'invoices', 'inventory', 'services'],
    secondaryModules: ['manufacturing', 'projects', 'vendors', 'expenses', 'reports'],
    hiddenModules: [],
  },
};

/**
 * Get business model profile for an organization
 */
export function getBusinessModelProfile(businessType: string): BusinessModelProfile {
  return BUSINESS_MODEL_PROFILES[businessType] || BUSINESS_MODEL_PROFILES.GENERAL;
}

/**
 * Check if a feature is enabled for a business model
 */
export function isFeatureEnabledForBusiness(
  businessType: string, 
  featureKey: keyof BusinessModelProfile['features']
): boolean {
  const profile = getBusinessModelProfile(businessType);
  return profile.features[featureKey];
}

/**
 * Get the appropriate industry type for COA generation based on business model
 */
export function getCOAIndustryType(businessType: string): string {
  const profile = getBusinessModelProfile(businessType);
  
  // Map to existing COA industry types
  const industryMapping: Record<IndustryCategory, string> = {
    'PROFESSIONAL_SERVICES': 'SERVICES',
    'CREATIVE_SERVICES': 'SERVICES', 
    'TECHNICAL_SERVICES': 'SERVICES',
    'RETAIL': 'RETAIL',
    'MANUFACTURING': 'MANUFACTURING',
    'HOSPITALITY': 'HOSPITALITY',
    'HEALTHCARE': 'HEALTHCARE',
    'CONSTRUCTION': 'CONSTRUCTION',
    'REAL_ESTATE': 'REAL_ESTATE',
    'NONPROFIT': 'NONPROFIT',
    'TECHNOLOGY': 'TECHNOLOGY',
    'MIXED': 'GENERAL',
    'ENTERPRISE': 'GENERAL',
    'GENERAL': 'GENERAL',
  };
  
  return industryMapping[profile.category] || 'GENERAL';
}