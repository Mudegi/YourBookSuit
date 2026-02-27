/**
 * LeaveService — Accrual Logic, Overlap Detection, Payroll Integration
 *
 * This service is imported by API routes and contains the pure business logic
 * for the Leave Management module. All methods operate on server-side Prisma.
 */
import prisma from '@/lib/prisma';

/* ────────────────────────────── TYPES ────────────────────────────── */

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  isPaid: boolean;
  annualAllotment: number;
  maxCarryForward: number;
  usedDays: number;          // approved days in the current year
  pendingDays: number;       // pending days in the current year
  availableDays: number;     // allotment - usedDays
  carryForwardDays: number;  // carried from previous year
  effectiveBalance: number;  // availableDays + carryForwardDays
}

export interface OverlapResult {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string | null;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
  daysRequested: number;
}

/* ──────────────────── ACCRUAL / BALANCE CALCULATION ──────────────── */

/**
 * Calculate leave balances for an employee for the given calendar year.
 * Returns one entry per active leave type in the organization.
 */
export async function getLeaveBalances(
  employeeId: string,
  organizationId: string,
  year: number = new Date().getFullYear()
): Promise<LeaveBalance[]> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);
  const prevYearStart = new Date(year - 1, 0, 1);
  const prevYearEnd = new Date(year - 1, 11, 31, 23, 59, 59);

  // Fetch all active leave types for this org
  const leaveTypes = await prisma.leaveType.findMany({
    where: { organizationId, isActive: true },
    orderBy: { name: 'asc' },
  });

  // Fetch all leave requests for this employee (approved + pending) for the year
  const requests = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      startDate: { gte: yearStart, lte: yearEnd },
      status: { in: ['APPROVED', 'PENDING'] },
    },
    select: { leaveTypeId: true, daysRequested: true, status: true },
  });

  // Fetch previous year approved days for carry-forward
  const prevYearRequests = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      startDate: { gte: prevYearStart, lte: prevYearEnd },
      status: 'APPROVED',
    },
    select: { leaveTypeId: true, daysRequested: true },
  });

  return leaveTypes.map((lt) => {
    const annualAllotment = lt.daysPerYear ? Number(lt.daysPerYear) : 0;
    const maxCarryForward = (lt as any).maxCarryForward ? Number((lt as any).maxCarryForward) : 0;

    const usedDays = requests
      .filter((r) => r.leaveTypeId === lt.id && r.status === 'APPROVED')
      .reduce((sum, r) => sum + Number(r.daysRequested), 0);

    const pendingDays = requests
      .filter((r) => r.leaveTypeId === lt.id && r.status === 'PENDING')
      .reduce((sum, r) => sum + Number(r.daysRequested), 0);

    const prevUsed = prevYearRequests
      .filter((r) => r.leaveTypeId === lt.id)
      .reduce((sum, r) => sum + Number(r.daysRequested), 0);

    const prevRemaining = Math.max(0, annualAllotment - prevUsed);
    const carryForwardDays = Math.min(prevRemaining, maxCarryForward);

    const availableDays = Math.max(0, annualAllotment - usedDays);
    const effectiveBalance = availableDays + carryForwardDays;

    return {
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      leaveTypeCode: lt.code,
      isPaid: lt.isPaid,
      annualAllotment,
      maxCarryForward,
      usedDays,
      pendingDays,
      availableDays,
      carryForwardDays,
      effectiveBalance,
    };
  });
}

/* ──────────────────────── OVERLAP DETECTION ──────────────────────── */

/**
 * Find overlapping approved/pending leave requests in the same department
 * during the requested date range. Excludes the requesting employee.
 */
export async function checkDepartmentOverlap(
  employeeId: string,
  departmentId: string | null,
  startDate: Date,
  endDate: Date,
  excludeRequestId?: string
): Promise<OverlapResult[]> {
  if (!departmentId) return [];

  const where: any = {
    employee: { departmentId },
    employeeId: { not: employeeId },
    status: { in: ['APPROVED', 'PENDING'] },
    OR: [
      { startDate: { lte: endDate }, endDate: { gte: startDate } },
    ],
  };

  if (excludeRequestId) {
    where.id = { not: excludeRequestId };
  }

  const overlapping = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, employeeNumber: true,
          department: { select: { name: true } },
        },
      },
      leaveType: { select: { name: true } },
    },
    orderBy: { startDate: 'asc' },
    take: 20,
  });

  return overlapping.map((r) => ({
    employeeId: r.employee.id,
    employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
    employeeNumber: r.employee.employeeNumber,
    departmentName: r.employee.department?.name || null,
    leaveTypeName: r.leaveType.name,
    startDate: r.startDate,
    endDate: r.endDate,
    daysRequested: Number(r.daysRequested),
  }));
}

/* ──────────────────── PAYROLL INTEGRATION HOOK ──────────────────── */

/**
 * Get total UNPAID leave days for an employee in a given month.
 * Used by payroll to calculate salary deductions.
 *
 * @returns number of unpaid leave days (approved only)
 */
export async function getUnpaidLeaveDays(
  employeeId: string,
  year: number,
  month: number // 1-12
): Promise<number> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59); // last day of month

  const unpaidRequests = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      leaveType: { isPaid: false },
      // Overlap with the target month
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    select: { startDate: true, endDate: true, daysRequested: true },
  });

  let totalDays = 0;
  for (const req of unpaidRequests) {
    // If the leave spans across months, only count the days within this month
    const effectiveStart = req.startDate > monthStart ? req.startDate : monthStart;
    const effectiveEnd = req.endDate < monthEnd ? req.endDate : monthEnd;

    if ((req as any).isHalfDay) {
      totalDays += 0.5;
    } else {
      // Count business days in the overlap range
      const days = countWeekdays(effectiveStart, effectiveEnd);
      totalDays += days;
    }
  }

  return totalDays;
}

/**
 * Get all leave days summary (paid + unpaid) for payroll reporting.
 */
export async function getMonthlyLeaveSummary(
  employeeId: string,
  year: number,
  month: number
): Promise<{ paidDays: number; unpaidDays: number; totalDays: number }> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const requests = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    include: { leaveType: { select: { isPaid: true } } },
  });

  let paidDays = 0;
  let unpaidDays = 0;

  for (const req of requests) {
    const effectiveStart = req.startDate > monthStart ? req.startDate : monthStart;
    const effectiveEnd = req.endDate < monthEnd ? req.endDate : monthEnd;
    const days = (req as any).isHalfDay ? 0.5 : countWeekdays(effectiveStart, effectiveEnd);

    if (req.leaveType.isPaid) {
      paidDays += days;
    } else {
      unpaidDays += days;
    }
  }

  return { paidDays, unpaidDays, totalDays: paidDays + unpaidDays };
}

/* ──────────────────────── VALIDATION HELPERS ──────────────────────── */

/**
 * Validate a leave request before creation:
 *  1. Check balance (skip for unpaid leave types)
 *  2. Check date validity
 *  3. Check for self-overlap (employee already has leave during those dates)
 */
export async function validateLeaveRequest(params: {
  employeeId: string;
  organizationId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  daysRequested: number;
  isHalfDay: boolean;
}): Promise<{ valid: boolean; error?: string; balance?: LeaveBalance }> {
  const { employeeId, organizationId, leaveTypeId, startDate, endDate, daysRequested, isHalfDay } = params;

  // Date validation
  if (endDate < startDate) {
    return { valid: false, error: 'End date must be on or after start date' };
  }

  // Half-day: start and end must be same date
  if (isHalfDay && startDate.toDateString() !== endDate.toDateString()) {
    return { valid: false, error: 'Half-day leave must be for a single date' };
  }

  // Fetch leave type
  const leaveType = await prisma.leaveType.findFirst({
    where: { id: leaveTypeId, organizationId, isActive: true },
  });
  if (!leaveType) {
    return { valid: false, error: 'Leave type not found or inactive' };
  }

  // Balance check (only for paid leave types with an allotment)
  if (leaveType.isPaid && leaveType.daysPerYear) {
    const year = startDate.getFullYear();
    const balances = await getLeaveBalances(employeeId, organizationId, year);
    const balance = balances.find((b) => b.leaveTypeId === leaveTypeId);

    if (balance && daysRequested > balance.effectiveBalance) {
      return {
        valid: false,
        error: `Insufficient balance: you have ${balance.effectiveBalance} days available but requested ${daysRequested}`,
        balance,
      };
    }

    return { valid: true, balance };
  }

  // Self-overlap check (prevent duplicate requests for same dates)
  const selfOverlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: { in: ['APPROVED', 'PENDING'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (selfOverlap) {
    return { valid: false, error: 'You already have a leave request overlapping these dates' };
  }

  return { valid: true };
}

/* ──────────────────────── UTILITY ──────────────────────── */

/** Count weekdays (Mon-Fri) between two dates inclusive */
function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  while (current <= last) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/** Calculate business days between dates (for auto-populating daysRequested) */
export function calculateBusinessDays(startDate: Date, endDate: Date, isHalfDay: boolean): number {
  if (isHalfDay) return 0.5;
  return countWeekdays(startDate, endDate);
}
