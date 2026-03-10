/**
 * Business Models and Feature Management
 */

export type BusinessModel = 
  | 'MANUFACTURING'
  | 'WHOLESALE'
  | 'RETAIL'
  | 'SERVICE'
  | 'ECOMMERCE'
  | 'CONSTRUCTION'
  | 'REAL_ESTATE'
  | 'HEALTHCARE'
  | 'HOSPITALITY'
  | 'PROFESSIONAL_SERVICES'
  | 'NONPROFIT'
  | 'GENERAL';

export interface BusinessModelProfile {
  name: string;
  description: string;
  icon: string;
  features: string[];
  modules: {
    inventory: boolean;
    manufacturing: boolean;
    projects: boolean;
    fixedAssets: boolean;
    crm: boolean;
    fieldService: boolean;
    warehouse: boolean;
    pos: boolean;
    ecommerce: boolean;
  };
}

export const BUSINESS_MODELS: Record<BusinessModel, BusinessModelProfile> = {
  MANUFACTURING: {
    name: 'Manufacturing',
    description: 'Production and assembly operations',
    icon: '🏭',
    features: [
      'Bill of Materials (BOM)',
      'Work Orders',
      'Production Planning',
      'Quality Control',
      'Inventory Management',
      'Cost Accounting',
    ],
    modules: {
      inventory: true,
      manufacturing: true,
      projects: true,
      fixedAssets: true,
      crm: true,
      fieldService: false,
      warehouse: true,
      pos: false,
      ecommerce: false,
    },
  },
  WHOLESALE: {
    name: 'Wholesale Distribution',
    description: 'Bulk goods distribution',
    icon: '📦',
    features: [
      'Inventory Management',
      'Purchase Orders',
      'Sales Orders',
      'Warehouse Management',
      'Customer Pricing',
      'Vendor Management',
    ],
    modules: {
      inventory: true,
      manufacturing: false,
      projects: false,
      fixedAssets: true,
      crm: true,
      fieldService: false,
      warehouse: true,
      pos: false,
      ecommerce: true,
    },
  },
  RETAIL: {
    name: 'Retail',
    description: 'Direct consumer sales',
    icon: '🏪',
    features: [
      'Point of Sale (POS)',
      'Inventory Tracking',
      'Customer Management',
      'Multi-location Support',
      'E-commerce Integration',
      'Loyalty Programs',
    ],
    modules: {
      inventory: true,
      manufacturing: false,
      projects: false,
      fixedAssets: true,
      crm: true,
      fieldService: false,
      warehouse: true,
      pos: true,
      ecommerce: true,
    },
  },
  SERVICE: {
    name: 'Service Business',
    description: 'Professional services',
    icon: '💼',
    features: [
      'Time Tracking',
      'Project Management',
      'Service Contracts',
      'Invoicing',
      'Resource Planning',
      'Client Portal',
    ],
    modules: {
      inventory: false,
      manufacturing: false,
      projects: true,
      fixedAssets: true,
      crm: true,
      fieldService: true,
      warehouse: false,
      pos: false,
      ecommerce: false,
    },
  },
  ECOMMERCE: {
    name: 'E-commerce',
    description: 'Online retail operations',
    icon: '🛒',
    features: [
      'Online Store Integration',
      'Order Management',
      'Inventory Sync',
      'Shipping Integration',
      'Payment Gateway',
      'Customer Analytics',
    ],
    modules: {
      inventory: true,
      manufacturing: false,
      projects: false,
      fixedAssets: false,
      crm: true,
      fieldService: false,
      warehouse: true,
      pos: false,
      ecommerce: true,
    },
  },
  CONSTRUCTION: {
    name: 'Construction',
    description: 'Construction and contracting',
    icon: '🏗️',
    features: [
      'Job Costing',
      'Project Management',
      'Progress Billing',
      'Equipment Tracking',
      'Subcontractor Management',
      'Change Orders',
    ],
    modules: {
      inventory: true,
      manufacturing: false,
      projects: true,
      fixedAssets: true,
      crm: true,
      fieldService: true,
      warehouse: false,
      pos: false,
      ecommerce: false,
    },
  },
  REAL_ESTATE: {
    name: 'Real Estate',
    description: 'Property management and sales',
    icon: '🏢',
    features: [
      'Property Management',
      'Lease Tracking',
      'Tenant Portal',
      'Maintenance Requests',
      'Rent Collection',
      'Commission Tracking',
    ],
    modules: {
      inventory: false,
      manufacturing: false,
      projects: true,
      fixedAssets: true,
      crm: true,
      fieldService: true,
      warehouse: false,
      pos: false,
      ecommerce: false,
    },
  },
  HEALTHCARE: {
    name: 'Healthcare',
    description: 'Medical and healthcare services',
    icon: '🏥',
    features: [
      'Patient Management',
      'Appointment Scheduling',
      'Insurance Billing',
      'Medical Records',
      'Inventory Control',
      'Compliance Tracking',
    ],
    modules: {
      inventory: true,
      manufacturing: false,
      projects: false,
      fixedAssets: true,
      crm: true,
      fieldService: false,
      warehouse: false,
      pos: false,
      ecommerce: false,
    },
  },
  HOSPITALITY: {
    name: 'Hospitality',
    description: 'Hotels, restaurants, and tourism',
    icon: '🏨',
    features: [
      'Reservation Management',
      'POS Integration',
      'Guest Portal',
      'Housekeeping',
      'Revenue Management',
      'Menu/Rate Management',
    ],
    modules: {
      inventory: true,
      manufacturing: false,
      projects: false,
      fixedAssets: true,
      crm: true,
      fieldService: false,
      warehouse: false,
      pos: true,
      ecommerce: true,
    },
  },
  PROFESSIONAL_SERVICES: {
    name: 'Professional Services',
    description: 'Consulting, legal, accounting',
    icon: '⚖️',
    features: [
      'Time & Billing',
      'Matter Management',
      'Document Management',
      'Client Portal',
      'Expense Tracking',
      'Retainer Management',
    ],
    modules: {
      inventory: false,
      manufacturing: false,
      projects: true,
      fixedAssets: false,
      crm: true,
      fieldService: false,
      warehouse: false,
      pos: false,
      ecommerce: false,
    },
  },
  NONPROFIT: {
    name: 'Nonprofit',
    description: 'Charitable organizations',
    icon: '🤝',
    features: [
      'Donor Management',
      'Grant Tracking',
      'Fund Accounting',
      'Volunteer Management',
      'Campaign Management',
      'Compliance Reporting',
    ],
    modules: {
      inventory: false,
      manufacturing: false,
      projects: true,
      fixedAssets: true,
      crm: true,
      fieldService: false,
      warehouse: false,
      pos: false,
      ecommerce: true,
    },
  },
  GENERAL: {
    name: 'General Business',
    description: 'All-purpose business operations',
    icon: '🏢',
    features: [
      'General Ledger',
      'Accounts Payable',
      'Accounts Receivable',
      'Financial Reporting',
      'Banking',
      'Tax Management',
    ],
    modules: {
      inventory: true,
      manufacturing: true,
      projects: true,
      fixedAssets: true,
      crm: true,
      fieldService: true,
      warehouse: true,
      pos: true,
      ecommerce: true,
    },
  },
};

/**
 * Get business model profile
 */
export function getBusinessModelProfile(model: BusinessModel): BusinessModelProfile {
  return BUSINESS_MODELS[model] || BUSINESS_MODELS.GENERAL;
}

/**
 * Check if a feature/module is enabled for a business model
 */
export function isFeatureEnabledForBusiness(
  businessModel: BusinessModel,
  feature: keyof BusinessModelProfile['modules']
): boolean {
  const profile = getBusinessModelProfile(businessModel);
  return profile.modules[feature];
}

/**
 * Get all available business models
 */
export function getAllBusinessModels(): Array<{
  value: BusinessModel;
  label: string;
  description: string;
  icon: string;
}> {
  return Object.entries(BUSINESS_MODELS).map(([key, profile]) => ({
    value: key as BusinessModel,
    label: profile.name,
    description: profile.description,
    icon: profile.icon,
  }));
}

/**
 * Get enabled modules for a business model
 */
export function getEnabledModules(businessModel: BusinessModel): string[] {
  const profile = getBusinessModelProfile(businessModel);
  return Object.entries(profile.modules)
    .filter(([_, enabled]) => enabled)
    .map(([module]) => module);
}

/**
 * Get recommended features for a business model
 */
export function getRecommendedFeatures(businessModel: BusinessModel): string[] {
  const profile = getBusinessModelProfile(businessModel);
  return profile.features;
}

export function getCOAIndustryType(businessType: string): string {
  const industryMapping: Record<string, string> = {
    'MANUFACTURING': 'MANUFACTURING',
    'WHOLESALE': 'RETAIL',
    'RETAIL': 'RETAIL',
    'SERVICE': 'SERVICES',
    'ECOMMERCE': 'RETAIL',
    'CONSTRUCTION': 'CONSTRUCTION',
    'REAL_ESTATE': 'REAL_ESTATE',
    'HEALTHCARE': 'HEALTHCARE',
    'HOSPITALITY': 'HOSPITALITY',
    'PROFESSIONAL_SERVICES': 'SERVICES',
    'NONPROFIT': 'NONPROFIT',
    'GENERAL': 'GENERAL',
  };
  return industryMapping[businessType] || 'GENERAL';
}
