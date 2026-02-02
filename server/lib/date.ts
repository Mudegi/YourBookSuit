/**
 * Date formatting and manipulation utilities
 */

import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

/**
 * Format date to standard display format
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return 'Invalid date';
  }

  return format(dateObj, formatStr);
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
}

/**
 * Format date for display in tables
 */
export function formatDateShort(date: Date | string): string {
  return formatDate(date, 'MM/dd/yyyy');
}

/**
 * Format date to ISO string for API
 */
export function formatDateISO(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj.toISOString();
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return 'Invalid date';
  }

  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Get fiscal year from date
 */
export function getFiscalYear(date: Date, fiscalYearStart: number = 1): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  if (month < fiscalYearStart) {
    return year - 1;
  }
  return year;
}

/**
 * Get start of fiscal year
 */
export function getFiscalYearStart(year: number, fiscalYearStart: number = 1): Date {
  return new Date(year, fiscalYearStart - 1, 1);
}

/**
 * Get end of fiscal year
 */
export function getFiscalYearEnd(year: number, fiscalYearStart: number = 1): Date {
  const nextYear = fiscalYearStart === 1 ? year : year + 1;
  const endMonth = fiscalYearStart === 1 ? 11 : fiscalYearStart - 2;
  const lastDay = new Date(nextYear, endMonth + 1, 0).getDate();
  
  return new Date(nextYear, endMonth, lastDay, 23, 59, 59, 999);
}

/**
 * Add days to date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get date range for common periods
 */
export function getDateRange(period: 'today' | 'week' | 'month' | 'quarter' | 'year'): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  switch (period) {
    case 'today':
      return {
        start: new Date(year, month, date, 0, 0, 0),
        end: new Date(year, month, date, 23, 59, 59),
      };

    case 'week':
      const dayOfWeek = now.getDay();
      const weekStart = new Date(year, month, date - dayOfWeek, 0, 0, 0);
      const weekEnd = new Date(year, month, date + (6 - dayOfWeek), 23, 59, 59);
      return { start: weekStart, end: weekEnd };

    case 'month':
      return {
        start: new Date(year, month, 1, 0, 0, 0),
        end: new Date(year, month + 1, 0, 23, 59, 59),
      };

    case 'quarter':
      const quarterMonth = Math.floor(month / 3) * 3;
      return {
        start: new Date(year, quarterMonth, 1, 0, 0, 0),
        end: new Date(year, quarterMonth + 3, 0, 23, 59, 59),
      };

    case 'year':
      return {
        start: new Date(year, 0, 1, 0, 0, 0),
        end: new Date(year, 11, 31, 23, 59, 59),
      };
  }
}

/**
 * Check if date is overdue
 */
export function isOverdue(dueDate: Date | string): boolean {
  const date = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  return date < new Date();
}

/**
 * Get days until/since date
 */
export function getDaysUntil(date: Date | string): number {
  const targetDate = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
