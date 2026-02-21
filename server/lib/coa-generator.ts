/**
 * Chart of Accounts (COA) Generator
 * 
 * This utility handles automated generation of Chart of Accounts based on industry templates.
 * Features:
 * - Industry-specific account templates
 * - Standardized accounting codes (1000s for Assets, 4000s for Revenue, etc.)
 * - Bulk account creation with database transaction safety
 * - Rollback protection to prevent partial setups
 */

import { prisma } from '@/lib/prisma';
import { AccountType } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export type IndustryType =
  | 'GENERAL'
  | 'RETAIL'
  | 'MANUFACTURING'
  | 'SERVICES'
  | 'CONSTRUCTION'
  | 'HOSPITALITY'
  | 'HEALTHCARE'
  | 'TECHNOLOGY'
  | 'REAL_ESTATE'
  | 'NONPROFIT';

export interface AccountTemplate {
  code: string;
  name: string;
  accountType: AccountType;
  accountSubType: string;
  description?: string;
  isSystem?: boolean;
}

export interface COAGenerationOptions {
  organizationId: string;
  industryType: IndustryType;
  baseCurrency?: string;
  includeOptionalAccounts?: boolean;
}

export interface COAGenerationResult {
  success: boolean;
  accountsCreated: number;
  accounts?: Array<{ code: string; name: string; id: string }>;
  error?: string;
}

// ============================================================================
// ACCOUNT TEMPLATES BY INDUSTRY
// ============================================================================

/**
 * Base accounts common to all industries (Standard Accounting Structure)
 */
const BASE_ACCOUNTS: AccountTemplate[] = [
  // ASSETS (1000-1999)
  { code: '1000', name: 'Cash on Hand', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Physical cash in the office', isSystem: true },
  { code: '1100', name: 'Checking Account', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Primary business bank account', isSystem: true },
  { code: '1200', name: 'Accounts Receivable', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Money owed by customers', isSystem: true },
  { code: '1300', name: 'Inventory', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Products available for sale', isSystem: true },
  { code: '1400', name: 'Input VAT / VAT Receivable', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'VAT paid on purchases - recoverable from tax authority', isSystem: true },
  { code: '1410', name: 'Prepaid Expenses', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Advance payments for future expenses' },
  { code: '1420', name: 'Prepaid Rent', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Rent paid in advance' },
  { code: '1430', name: 'Prepaid Insurance', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Insurance premiums paid in advance' },
  { code: '1500', name: 'Property, Plant & Equipment', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Long-term tangible assets', isSystem: true },
  { code: '1510', name: 'Accumulated Depreciation', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Contra-asset for depreciation', isSystem: true },
  { code: '1520', name: 'Furniture & Fixtures', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Office furniture and fixtures' },
  { code: '1530', name: 'Vehicles', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Company vehicles and transportation equipment' },
  { code: '1540', name: 'Computer Equipment', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'IT hardware and computer systems' },
  { code: '1600', name: 'Intangible Assets', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Patents, trademarks, goodwill' },
  { code: '1610', name: 'Software & Licenses', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Software licenses and subscriptions' },

  // LIABILITIES (2000-2999)
  { code: '2000', name: 'Accounts Payable', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Money owed to suppliers', isSystem: true },
  { code: '2100', name: 'Withholding Tax Payable', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'WHT withheld from supplier payments - payable to URA', isSystem: true },
  { code: '2110', name: 'Output VAT / VAT Payable', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'VAT collected on sales - payable to tax authority', isSystem: true },
  { code: '2120', name: 'PAYE Payable', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Employee income tax withheld - payable to URA', isSystem: true },
  { code: '2130', name: 'NSSF Payable', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Social security contributions payable', isSystem: true },
  { code: '2140', name: 'Corporate Tax Payable', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Corporate income tax payable' },
  { code: '2150', name: 'Excise Duty Payable', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Excise duty collected - payable to URA', isSystem: true },
  { code: '2200', name: 'Accrued Expenses', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Expenses incurred but not yet paid' },
  { code: '2210', name: 'Accrued Salaries', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Salaries earned but not yet paid' },
  { code: '2220', name: 'Accrued Utilities', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Utilities consumed but not yet billed' },
  { code: '2300', name: 'Short-term Loans', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Loans due within one year' },
  { code: '2310', name: 'Bank Overdraft', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Negative bank balance' },
  { code: '2400', name: 'Customer Deposits', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Advance payments from customers' },
  { code: '2500', name: 'Long-term Debt', accountType: AccountType.LIABILITY, accountSubType: 'Long-term Liabilities', description: 'Loans due after one year' },
  { code: '2510', name: 'Mortgage Payable', accountType: AccountType.LIABILITY, accountSubType: 'Long-term Liabilities', description: 'Long-term property loans' },

  // EQUITY (3000-3999)
  { code: '3000', name: 'Owner\'s Capital', accountType: AccountType.EQUITY, accountSubType: 'Equity', description: 'Owner\'s investment in business', isSystem: true },
  { code: '3100', name: 'Retained Earnings', accountType: AccountType.EQUITY, accountSubType: 'Equity', description: 'Accumulated profits not distributed', isSystem: true },
  { code: '3200', name: 'Owner\'s Draw', accountType: AccountType.EQUITY, accountSubType: 'Equity', description: 'Owner withdrawals from business' },
  { code: '3300', name: 'Dividends Paid', accountType: AccountType.EQUITY, accountSubType: 'Equity', description: 'Distributions to shareholders' },
  { code: '3900', name: 'Opening Balance Equity', accountType: AccountType.EQUITY, accountSubType: 'Equity', description: 'Balancing account for opening balances and inventory', isSystem: true },

  // REVENUE (4000-4999)
  { code: '4000', name: 'Sales Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Primary business income', isSystem: true },
  { code: '4100', name: 'Service Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Income from services provided', isSystem: true },
  { code: '4200', name: 'Interest Income', accountType: AccountType.REVENUE, accountSubType: 'Other Revenue', description: 'Interest earned on deposits' },
  { code: '4300', name: 'Other Income', accountType: AccountType.REVENUE, accountSubType: 'Other Revenue', description: 'Miscellaneous income' },
  { code: '4400', name: 'Foreign Exchange Gain', accountType: AccountType.REVENUE, accountSubType: 'Other Revenue', description: 'Gains from currency conversion', isSystem: true },
  { code: '4500', name: 'Sales Discounts Given', accountType: AccountType.REVENUE, accountSubType: 'Revenue Adjustments', description: 'Discounts provided to customers (contra-revenue)' },
  { code: '4600', name: 'Sales Returns & Allowances', accountType: AccountType.REVENUE, accountSubType: 'Revenue Adjustments', description: 'Customer returns and allowances (contra-revenue)' },

  // COST OF SALES (5000-5999)
  { code: '5000', name: 'Cost of Goods Sold', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Direct cost of products sold', isSystem: true },
  { code: '5100', name: 'Purchase Discounts Received', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Discounts received from suppliers (contra-expense)' },
  { code: '5200', name: 'Freight & Shipping In', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Shipping costs for purchases' },
  { code: '5300', name: 'Inventory Shrinkage', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Theft, damage, or obsolescence losses' },

  // EXPENSES (6000-9999)
  { code: '6000', name: 'Salaries & Wages', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Employee compensation', isSystem: true },
  { code: '6050', name: 'Employee Benefits', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Health insurance, retirement contributions' },
  { code: '6100', name: 'Rent Expense', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Office or facility rent' },
  { code: '6200', name: 'Utilities Expense', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Electricity, water, internet' },
  { code: '6210', name: 'Telephone & Internet', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Communication expenses' },
  { code: '6300', name: 'Office Supplies', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Stationery and office materials' },
  { code: '6400', name: 'Insurance Expense', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Business insurance premiums' },
  { code: '6500', name: 'Depreciation Expense', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Asset depreciation charges', isSystem: true },
  { code: '6550', name: 'Repairs & Maintenance', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Equipment and facility maintenance' },
  { code: '6600', name: 'Marketing & Advertising', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Promotional activities' },
  { code: '6700', name: 'Professional Fees', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Legal, accounting, consulting fees' },
  { code: '6750', name: 'Audit & Compliance Fees', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'External audit and regulatory compliance' },
  { code: '6800', name: 'Travel & Entertainment', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Business travel and meals' },
  { code: '6850', name: 'Fuel & Vehicle Expense', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Vehicle fuel and running costs' },
  { code: '6900', name: 'Bank Fees & Charges', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Bank service charges and transaction fees' },
  { code: '7000', name: 'Interest Expense', accountType: AccountType.EXPENSE, accountSubType: 'Financial Expenses', description: 'Interest on loans and debt' },
  { code: '7100', name: 'Foreign Exchange Loss', accountType: AccountType.EXPENSE, accountSubType: 'Financial Expenses', description: 'Losses from currency conversion', isSystem: true },
  { code: '7200', name: 'Quality Control Expense', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Quality assurance and testing costs' },
  { code: '7300', name: 'Rework Expense', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Costs associated with reworking defective products' },
  { code: '7400', name: 'RTV Expense', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Costs for returning goods to vendors' },
  { code: '7500', name: 'Scrap Loss Expense', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Loss from scrapped or written-off inventory' },
  { code: '9000', name: 'Miscellaneous Expense', accountType: AccountType.EXPENSE, accountSubType: 'Other Expenses', description: 'Unclassified expenses' },
];

/**
 * Industry-specific additional accounts
 */
const INDUSTRY_ACCOUNTS: Record<IndustryType, AccountTemplate[]> = {
  GENERAL: [],

  RETAIL: [
    // CURRENT ASSETS - Inventory (1300s)
    { code: '1310', name: 'Inventory - Retail Products', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Merchandise inventory available for sale', isSystem: true },
    { code: '1350', name: 'Merchandise Inventory', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Additional retail products for sale' },
    
    // CURRENT LIABILITIES - Sales Tax (2100s)
    { code: '2110', name: 'Sales Tax Payable', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Sales tax collected from customers awaiting remittance', isSystem: true },
    { code: '2120', name: 'VAT Payable', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Value-added tax payable' },
    
    // REVENUE - Sales (4000s)
    { code: '4010', name: 'Sales Revenue - Products', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Primary retail sales revenue', isSystem: true },
    { code: '4020', name: 'Sales Revenue - Online', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'E-commerce sales revenue' },
    { code: '4050', name: 'Product Sales', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Revenue from product sales' },
    { code: '4400', name: 'Sales Returns & Allowances', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Customer returns and discounts' },
    { code: '4500', name: 'Sales Discounts', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Discounts given to customers' },
    
    // COST OF SALES - COGS (5000s)
    { code: '5010', name: 'Cost of Goods Sold (COGS)', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Direct cost of products sold to customers', isSystem: true },
    { code: '5020', name: 'Purchase Returns & Allowances', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Returns and allowances from suppliers' },
    { code: '5030', name: 'Inventory Shrinkage', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Loss due to theft, damage, or obsolescence' },
    { code: '5200', name: 'Freight In', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Shipping costs for inventory purchases' },
    { code: '5300', name: 'Inventory Adjustments', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Adjustments for inventory valuation' },
    
    // OPERATING EXPENSES - Retail Specific (6000s)
    { code: '6110', name: 'Merchant Processing Fees', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Credit card and payment processing fees', isSystem: true },
    { code: '6120', name: 'Payment Gateway Fees', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Online payment gateway transaction fees' },
    { code: '6150', name: 'Store Supplies', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Store operation materials and supplies' },
    { code: '6160', name: 'Packaging Materials', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Bags, boxes, and packaging supplies' },
    { code: '6170', name: 'Shipping & Delivery', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Customer delivery and shipping costs' },
    { code: '6650', name: 'Point of Sale Fees', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'POS system subscription and transaction fees' },
    { code: '6660', name: 'E-commerce Platform Fees', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Online marketplace and platform fees' },
  ],

  MANUFACTURING: [
    { code: '1310', name: 'Raw Materials Inventory', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Unprocessed materials' },
    { code: '1320', name: 'Work in Progress Inventory', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Partially completed goods' },
    { code: '1330', name: 'Finished Goods Inventory', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Completed products' },
    { code: '5050', name: 'Direct Labor', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Production labor costs' },
    { code: '5150', name: 'Manufacturing Overhead', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Indirect production costs' },
    { code: '5250', name: 'Factory Supplies', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Production consumables' },
    { code: '6550', name: 'Maintenance & Repairs', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Equipment maintenance' },
    { code: '6750', name: 'Quality Control', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Quality assurance costs' },
  ],

  SERVICES: [
    { code: '1250', name: 'Unbilled Receivables', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Work completed but not yet invoiced' },
    { code: '2250', name: 'Unearned Revenue', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Advance payments for services' },
    { code: '4150', name: 'Consulting Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Consulting service income' },
    { code: '4160', name: 'Project Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Project-based income' },
    { code: '5300', name: 'Subcontractor Costs', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Costs for external contractors' },
    { code: '6050', name: 'Contract Labor', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Temporary staff costs' },
  ],

  CONSTRUCTION: [
    { code: '1340', name: 'Construction in Progress', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Ongoing project costs' },
    { code: '1450', name: 'Equipment Deposits', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Deposits on rented equipment' },
    { code: '2350', name: 'Customer Deposits', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Advance payments from clients' },
    { code: '4170', name: 'Construction Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Project completion revenue' },
    { code: '5350', name: 'Materials Cost', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Construction materials' },
    { code: '5400', name: 'Equipment Rental', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Heavy equipment rental costs' },
    { code: '6850', name: 'Permits & Licenses', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Government permits and licenses' },
  ],

  HOSPITALITY: [
    { code: '1360', name: 'Food & Beverage Inventory', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Restaurant and bar supplies' },
    { code: '1370', name: 'Linen & Supplies Inventory', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Hospitality supplies' },
    { code: '4180', name: 'Room Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Hotel room income' },
    { code: '4190', name: 'Food & Beverage Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Restaurant and bar income' },
    { code: '5450', name: 'Food Costs', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Cost of food and ingredients' },
    { code: '5500', name: 'Beverage Costs', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Cost of beverages' },
    { code: '6250', name: 'Housekeeping Supplies', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Cleaning and maintenance supplies' },
  ],

  HEALTHCARE: [
    { code: '1280', name: 'Medical Supplies Inventory', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Medical supplies and medications' },
    { code: '1290', name: 'Insurance Receivables', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Amounts due from insurance companies' },
    { code: '4210', name: 'Patient Service Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Direct patient care income' },
    { code: '4220', name: 'Insurance Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Insurance reimbursements' },
    { code: '5550', name: 'Medical Supplies Cost', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Cost of medical consumables' },
    { code: '6450', name: 'Medical Malpractice Insurance', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Professional liability insurance' },
    { code: '6780', name: 'Medical Equipment Maintenance', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Equipment service costs' },
  ],

  TECHNOLOGY: [
    { code: '1620', name: 'Software Licenses', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Capitalized software licenses' },
    { code: '1630', name: 'Development in Progress', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Software under development' },
    { code: '4230', name: 'Software License Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'License sales' },
    { code: '4240', name: 'Subscription Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Recurring subscription income' },
    { code: '4250', name: 'Maintenance & Support Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Support contract income' },
    { code: '5600', name: 'Cloud Hosting Costs', accountType: AccountType.COST_OF_SALES, accountSubType: 'Direct Costs', description: 'Server and hosting expenses' },
    { code: '6010', name: 'Research & Development', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Product development costs' },
    { code: '6350', name: 'Software Subscriptions', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'SaaS and tool subscriptions' },
  ],

  REAL_ESTATE: [
    // ASSETS - Properties & Receivables
    { code: '1240', name: 'Rent Receivable', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Outstanding rent payments from tenants', isSystem: true },
    { code: '1520', name: 'Investment Property', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Income-generating rental properties', isSystem: true },
    { code: '1525', name: 'Commercial Properties', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Commercial real estate holdings' },
    { code: '1530', name: 'Property Under Development', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Properties being developed or renovated' },
    { code: '1540', name: 'Land Held for Investment', accountType: AccountType.ASSET, accountSubType: 'Fixed Assets', description: 'Undeveloped land holdings' },
    
    // LIABILITIES - Tenant Obligations
    { code: '2130', name: 'Tenant Security Deposits', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Security deposits held on behalf of tenants - must be returned', isSystem: true },
    { code: '2135', name: 'Prepaid Rent Liability', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Rent collected in advance from tenants' },
    { code: '2140', name: 'Tenant Damage Deposits', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Deposits held for potential property damage' },
    { code: '2500', name: 'Mortgage Payable - Properties', accountType: AccountType.LIABILITY, accountSubType: 'Long-term Liabilities', description: 'Property mortgage loans' },
    
    // REVENUE - Rental Income
    { code: '4110', name: 'Rental Income - Residential', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Residential property rental income', isSystem: true },
    { code: '4120', name: 'Rental Income - Commercial', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Commercial property rental income' },
    { code: '4130', name: 'Parking & Storage Income', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Additional rental income from parking and storage' },
    { code: '4140', name: 'Late Fee Income', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Late payment fees from tenants' },
    { code: '4150', name: 'Pet Fees & Deposits', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Non-refundable pet fees and deposits' },
    { code: '4270', name: 'Property Management Fees', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Management service income from third-party properties' },
    { code: '4350', name: 'Lease Cancellation Fees', accountType: AccountType.REVENUE, accountSubType: 'Other Revenue', description: 'Fees for early lease termination' },
    { code: '4360', name: 'Forfeited Security Deposits', accountType: AccountType.REVENUE, accountSubType: 'Other Revenue', description: 'Non-refundable portion of security deposits' },
    
    // EXPENSES - Property Operating Costs
    { code: '6210', name: 'Property Maintenance Expenses', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'General property maintenance and repairs', isSystem: true },
    { code: '6215', name: 'HVAC Maintenance', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Heating, ventilation, and air conditioning maintenance' },
    { code: '6220', name: 'Landscaping & Grounds', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Lawn care and exterior maintenance' },
    { code: '6225', name: 'Pest Control', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Pest management services' },
    { code: '6230', name: 'Cleaning & Janitorial', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Common area cleaning services' },
    { code: '6235', name: 'Security Services', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Property security and monitoring' },
    { code: '6240', name: 'Utilities - Common Areas', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Electricity, water, gas for common areas' },
    { code: '6245', name: 'Property Insurance', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Building and liability insurance' },
    { code: '6250', name: 'Property Taxes', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Real estate property taxes', isSystem: true },
    { code: '6255', name: 'HOA & Condo Fees', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Homeowners association and condo fees' },
    { code: '6260', name: 'Property Management Fees', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Third-party property management costs' },
    { code: '6265', name: 'Leasing Commissions', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Real estate agent leasing fees' },
    { code: '6270', name: 'Legal & Eviction Costs', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Legal fees and eviction proceedings' },
    { code: '6275', name: 'Vacancy Loss', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Lost income from vacant units' },
    { code: '6280', name: 'Turnover Expenses', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Costs to prepare units between tenants' },
    { code: '6285', name: 'Repairs & Renovations', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Major repairs and property improvements' },
  ],

  NONPROFIT: [
    { code: '1270', name: 'Grants Receivable', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Grants awarded but not received' },
    { code: '1480', name: 'Pledges Receivable', accountType: AccountType.ASSET, accountSubType: 'Current Assets', description: 'Donor pledges outstanding' },
    { code: '2280', name: 'Deferred Grant Revenue', accountType: AccountType.LIABILITY, accountSubType: 'Current Liabilities', description: 'Grant funds with restrictions' },
    { code: '3300', name: 'Unrestricted Net Assets', accountType: AccountType.EQUITY, accountSubType: 'Equity', description: 'Funds without donor restrictions' },
    { code: '3400', name: 'Temporarily Restricted Net Assets', accountType: AccountType.EQUITY, accountSubType: 'Equity', description: 'Funds with time/purpose restrictions' },
    { code: '3500', name: 'Permanently Restricted Net Assets', accountType: AccountType.EQUITY, accountSubType: 'Equity', description: 'Endowment funds' },
    { code: '4280', name: 'Donation Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Individual donations' },
    { code: '4290', name: 'Grant Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Foundation and government grants' },
    { code: '4310', name: 'Fundraising Revenue', accountType: AccountType.REVENUE, accountSubType: 'Operating Revenue', description: 'Event and campaign income' },
    { code: '6090', name: 'Program Expenses', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Direct mission-related costs' },
    { code: '6690', name: 'Fundraising Expenses', accountType: AccountType.EXPENSE, accountSubType: 'Operating Expenses', description: 'Cost of raising funds' },
  ],
};

// ============================================================================
// MAIN GENERATION LOGIC
// ============================================================================

/**
 * Get account templates for a specific industry
 */
export function getAccountTemplates(industryType: IndustryType, includeOptional: boolean = true): AccountTemplate[] {
  const industryAccounts = INDUSTRY_ACCOUNTS[industryType] || [];
  
  if (includeOptional) {
    return [...BASE_ACCOUNTS, ...industryAccounts];
  }
  
  // Only return base accounts if optional accounts are excluded
  return BASE_ACCOUNTS;
}

/**
 * Generate Chart of Accounts for an organization
 * 
 * This function performs a bulk creation of accounts within a transaction.
 * If any account creation fails, the entire operation is rolled back to maintain
 * data integrity and prevent 'ghost' companies with incomplete account structures.
 * 
 * @param options - Configuration for COA generation
 * @returns Result object with success status and created accounts
 */
export async function generateChartOfAccounts(
  options: COAGenerationOptions
): Promise<COAGenerationResult> {
  const {
    organizationId,
    industryType,
    baseCurrency: inputCurrency,
    includeOptionalAccounts = true,
  } = options;

  try {
    // Validate organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, baseCurrency: true },
    });

    if (!organization) {
      return {
        success: false,
        accountsCreated: 0,
        error: 'Organization not found',
      };
    }

    const baseCurrency = inputCurrency || organization.baseCurrency || 'USD';

    // Check if COA already exists for this organization
    const existingAccounts = await prisma.chartOfAccount.count({
      where: { organizationId },
    });

    if (existingAccounts > 0) {
      return {
        success: false,
        accountsCreated: 0,
        error: `Organization already has ${existingAccounts} accounts. COA generation is only for new organizations.`,
      };
    }

    // Get account templates
    const templates = getAccountTemplates(industryType, includeOptionalAccounts);

    // Execute bulk creation within a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdAccounts = [];

      for (const template of templates) {
        const account = await tx.chartOfAccount.create({
          data: {
            organizationId,
            code: template.code,
            name: template.name,
            accountType: template.accountType,
            accountSubType: template.accountSubType,
            description: template.description,
            currency: baseCurrency,
            isActive: true,
            isSystem: template.isSystem ?? false,
            balance: 0,
          },
          select: {
            id: true,
            code: true,
            name: true,
          },
        });

        createdAccounts.push(account);
      }

      return createdAccounts;
    });

    return {
      success: true,
      accountsCreated: result.length,
      accounts: result,
    };
  } catch (error) {
    console.error('COA Generation Error:', error);
    
    return {
      success: false,
      accountsCreated: 0,
      error: error instanceof Error ? error.message : 'Failed to generate chart of accounts',
    };
  }
}

/**
 * Validate if an organization can have COA generated
 */
export async function canGenerateCOA(organizationId: string): Promise<{ canGenerate: boolean; reason?: string }> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        _count: {
          select: {
            chartOfAccounts: true,
          },
        },
      },
    });

    if (!organization) {
      return { canGenerate: false, reason: 'Organization not found' };
    }

    if (organization._count.chartOfAccounts > 0) {
      return {
        canGenerate: false,
        reason: `Organization already has ${organization._count.chartOfAccounts} accounts`,
      };
    }

    return { canGenerate: true };
  } catch (error) {
    return {
      canGenerate: false,
      reason: 'Error checking organization status',
    };
  }
}

/**
 * Get available industry types for COA generation
 */
export function getAvailableIndustries(): Array<{ value: IndustryType; label: string; accountCount: number }> {
  return [
    { value: 'GENERAL', label: 'General Business', accountCount: BASE_ACCOUNTS.length },
    { value: 'RETAIL', label: 'Retail & E-commerce', accountCount: BASE_ACCOUNTS.length + INDUSTRY_ACCOUNTS.RETAIL.length },
    { value: 'MANUFACTURING', label: 'Manufacturing', accountCount: BASE_ACCOUNTS.length + INDUSTRY_ACCOUNTS.MANUFACTURING.length },
    { value: 'SERVICES', label: 'Professional Services', accountCount: BASE_ACCOUNTS.length + INDUSTRY_ACCOUNTS.SERVICES.length },
    { value: 'CONSTRUCTION', label: 'Construction', accountCount: BASE_ACCOUNTS.length + INDUSTRY_ACCOUNTS.CONSTRUCTION.length },
    { value: 'HOSPITALITY', label: 'Hospitality & Tourism', accountCount: BASE_ACCOUNTS.length + INDUSTRY_ACCOUNTS.HOSPITALITY.length },
    { value: 'HEALTHCARE', label: 'Healthcare', accountCount: BASE_ACCOUNTS.length + INDUSTRY_ACCOUNTS.HEALTHCARE.length },
    { value: 'TECHNOLOGY', label: 'Technology & Software', accountCount: BASE_ACCOUNTS.length + INDUSTRY_ACCOUNTS.TECHNOLOGY.length },
    { value: 'REAL_ESTATE', label: 'Real Estate', accountCount: BASE_ACCOUNTS.length + INDUSTRY_ACCOUNTS.REAL_ESTATE.length },
    { value: 'NONPROFIT', label: 'Nonprofit Organization', accountCount: BASE_ACCOUNTS.length + INDUSTRY_ACCOUNTS.NONPROFIT.length },
  ];
}

/**
 * Preview accounts that would be created for an industry
 */
export function previewCOA(industryType: IndustryType): {
  industry: string;
  totalAccounts: number;
  accountsByType: Record<string, number>;
  templates: AccountTemplate[];
} {
  const templates = getAccountTemplates(industryType, true);
  
  const accountsByType = templates.reduce((acc, template) => {
    const type = template.accountType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    industry: industryType,
    totalAccounts: templates.length,
    accountsByType,
    templates,
  };
}
