/**
 * Stub file for backward compatibility
 * All permission checks have been removed - all actions are now allowed
 */

import { UserRole } from '@prisma/client';

// Legacy permission enum - kept for compatibility but not used
export enum Permission {
  VIEW_ORGANIZATION = 'view:organization',
  MANAGE_ORGANIZATION = 'manage:organization',
  VIEW_CHART_OF_ACCOUNTS = 'view:chart_of_accounts',
  MANAGE_CHART_OF_ACCOUNTS = 'manage:chart_of_accounts',
  CREATE_JOURNAL_ENTRY = 'create:journal_entry',
  VOID_TRANSACTION = 'void:transaction',
  VIEW_CUSTOMERS = 'view:customers',
  MANAGE_CUSTOMERS = 'manage:customers',
  VIEW_INVOICES = 'view:invoices',
  CREATE_INVOICE = 'create:invoice',
  EDIT_INVOICE = 'edit:invoice',
  VOID_INVOICE = 'void:invoice',
  VIEW_VENDORS = 'view:vendors',
  MANAGE_VENDORS = 'manage:vendors',
  VIEW_BILLS = 'view:bills',
  CREATE_BILL = 'create:bill',
  APPROVE_BILL = 'approve:bill',
  CREATE_PAYMENT = 'create:payment',
  VIEW_BANK_ACCOUNTS = 'view:bank_accounts',
  MANAGE_BANK_ACCOUNTS = 'manage:bank_accounts',
  RECONCILE_BANK = 'reconcile:bank',
  VIEW_INVENTORY = 'view:inventory',
  MANAGE_INVENTORY = 'manage:inventory',
  ADJUST_INVENTORY = 'adjust:inventory',
  VIEW_MANUFACTURING = 'view:manufacturing',
  MANAGE_MANUFACTURING = 'manage:manufacturing',
  VIEW_WAREHOUSE = 'view:warehouse',
  MANAGE_WAREHOUSE = 'manage:warehouse',
  VIEW_FIXED_ASSETS = 'view:fixed_assets',
  MANAGE_FIXED_ASSETS = 'manage:fixed_assets',
  VIEW_REPORTS = 'view:reports',
  EXPORT_REPORTS = 'export:reports',
  VIEW_SETTINGS = 'view:settings',
  MANAGE_SETTINGS = 'manage:settings',
  MANAGE_USERS = 'manage:users',
  VIEW_AUDIT_LOG = 'view:audit_log',
  VIEW_EMPLOYEES = 'view:employees',
  MANAGE_EMPLOYEES = 'manage:employees',
  VIEW_PAYROLL = 'view:payroll',
  MANAGE_PAYROLL = 'manage:payroll',
  VIEW_PROJECTS = 'view:projects',
  MANAGE_PROJECTS = 'manage:projects',
  VIEW_CRM = 'view:crm',
  MANAGE_CRM = 'manage:crm',
  VIEW_SERVICES = 'view:services',
  CREATE_SERVICES = 'create:services',
  MANAGE_SERVICES = 'manage:services',
  VIEW_TAX_RULES = 'view:tax_rules',
  MANAGE_TAX_RULES = 'manage:tax_rules',
  VIEW_TAX_JURISDICTIONS = 'view:tax_jurisdictions',
  MANAGE_TAX_JURISDICTIONS = 'manage:tax_jurisdictions',
  VIEW_TAX_EXEMPTIONS = 'view:tax_exemptions',
  MANAGE_TAX_EXEMPTIONS = 'manage:tax_exemptions',
  VIEW_TAX_REPORTS = 'view:tax_reports',
  VIEW_QUALITY = 'view:quality',
  MANAGE_QUALITY = 'manage:quality',
  VIEW_WORKFLOWS = 'view:workflows',
  MANAGE_WORKFLOWS = 'manage:workflows',
}

/**
 * Always returns true - no permission checks
 */
export function hasPermission(
  userRole: UserRole,
  permission: Permission
): boolean {
  return true;
}

/**
 * Always returns true - no permission checks
 */
export function hasMinimumRole(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return true;
}

/**
 * Always returns true - no permission checks
 */
export function hasAllPermissions(
  userRole: UserRole,
  permissions: Permission[]
): boolean {
  return true;
}

/**
 * Always returns true - no permission checks
 */
export function hasAnyPermission(
  userRole: UserRole,
  permissions: Permission[]
): boolean {
  return true;
}
