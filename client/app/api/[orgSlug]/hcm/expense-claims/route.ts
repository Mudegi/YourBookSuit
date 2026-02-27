import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { ExpenseClaimService } from '@/services/hcm/expense-claim.service';
import { z } from 'zod';

const expenseItemSchema = z.object({
  expenseDate: z.coerce.date(),
  categoryId: z.string().optional(),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  taxInclusive: z.boolean().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  receiptUrl: z.string().optional(),
  receiptName: z.string().optional(),
  merchantName: z.string().optional(),
  notes: z.string().optional(),
});

const expenseClaimSchema = z.object({
  employeeId: z.string().min(1),
  claimDate: z.coerce.date(),
  currency: z.string().optional(),
  exchangeRate: z.number().positive().optional(),
  paymentMethod: z.string().optional(),
  merchantName: z.string().optional(),
  projectId: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  submitImmediately: z.boolean().optional(),
  items: z.array(expenseItemSchema).min(1),
});

// GET /api/[orgSlug]/hcm/expense-claims
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'read');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    const where: any = {};
    // Support both pre-migration (employee.organizationId) and post-migration (organizationId)
    try {
      // Try post-migration query first
      await (prisma.expenseClaim as any).findFirst({ where: { organizationId: org.id }, select: { id: true } });
      where.organizationId = org.id;
    } catch {
      where.employee = { organizationId: org.id };
    }
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    const claims = await prisma.expenseClaim.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeNumber: true,
            department: { select: { name: true } },
            manager: { select: { firstName: true, lastName: true } },
          },
        },
        approver: { select: { id: true, firstName: true, lastName: true } },
        payer: { select: { id: true, firstName: true, lastName: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = claims.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      employeeId: c.employeeId,
      employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
      employeeNumber: c.employee.employeeNumber,
      department: c.employee.department?.name || null,
      managerName: c.employee.manager ? `${c.employee.manager.firstName} ${c.employee.manager.lastName}` : null,
      claimDate: c.claimDate,
      totalAmount: Number(c.totalAmount),
      totalTax: Number((c as any).totalTax || 0),
      netAmount: Number((c as any).netAmount || 0),
      currency: c.currency,
      exchangeRate: Number((c as any).exchangeRate || 1),
      amountInBase: Number((c as any).amountInBase || 0),
      paymentMethod: (c as any).paymentMethod,
      merchantName: (c as any).merchantName,
      status: c.status,
      purpose: c.purpose,
      rejectionReason: (c as any).rejectionReason,
      submittedAt: (c as any).submittedAt,
      approvedBy: c.approver ? `${c.approver.firstName} ${c.approver.lastName}` : null,
      approvedAt: c.approvedAt,
      paidBy: c.payer ? `${c.payer.firstName} ${c.payer.lastName}` : null,
      paidAt: c.paidAt,
      paidViaPayroll: (c as any).paidViaPayroll,
      itemCount: c.items.length,
      items: c.items.map((item) => ({
        id: item.id,
        expenseDate: item.expenseDate,
        categoryId: (item as any).categoryId,
        categoryName: (item as any).glAccount?.name || item.category,
        categoryCode: (item as any).glAccount?.code || null,
        category: item.category,
        description: item.description,
        amount: Number(item.amount),
        taxInclusive: (item as any).taxInclusive || false,
        taxRate: Number((item as any).taxRate || 0),
        taxAmount: Number((item as any).taxAmount || 0),
        netAmount: Number((item as any).netAmount || 0),
        receiptUrl: item.receiptUrl,
        receiptName: (item as any).receiptName,
        merchantName: (item as any).merchantName,
        notes: item.notes,
      })),
      createdAt: c.createdAt,
    }));

    // Metrics — graceful fallback
    let metrics = { total: 0, draft: 0, submitted: 0, approved: 0, rejected: 0, paid: 0, queried: 0, pendingReimbursement: 0, pendingAmount: 0, paidAmount: 0 };
    try {
      metrics = await ExpenseClaimService.getMetrics(org.id);
    } catch {
      // Pre-migration: compute basic metrics from loaded data
      metrics.total = data.length;
      for (const d of data) {
        const s = d.status as string;
        if (s === 'DRAFT') metrics.draft++;
        else if (s === 'SUBMITTED') metrics.submitted++;
        else if (s === 'APPROVED') metrics.approved++;
        else if (s === 'REJECTED') metrics.rejected++;
        else if (s === 'PAID') metrics.paid++;
      }
      metrics.pendingReimbursement = metrics.submitted + metrics.approved;
    }

    return NextResponse.json({ success: true, data, metrics });
  } catch (error) {
    console.error('Error listing expense claims:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch expense claims' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/hcm/expense-claims
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'create');

    const body = await request.json();
    const parsed = expenseClaimSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    // Validate employee
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, organizationId: org.id },
    });
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // Duplicate detection
    const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0);
    const dupe = await ExpenseClaimService.checkDuplicate(
      org.id, input.employeeId, input.claimDate, totalAmount
    );
    if (dupe.isDuplicate) {
      return NextResponse.json({
        success: false,
        error: `Potential duplicate claim: matches ${dupe.existingClaimNumber} with same amount and date`,
      }, { status: 409 });
    }

    // Policy validation
    const violations = await ExpenseClaimService.validatePolicies(
      org.id, input.employeeId, input.items, input.currency || org.baseCurrency
    );
    const blockingViolations = violations.filter((v) => v.severity === 'BLOCK');
    if (blockingViolations.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Policy violations',
        violations: blockingViolations,
      }, { status: 422 });
    }

    const claim = await ExpenseClaimService.createClaim({
      organizationId: org.id,
      employeeId: input.employeeId,
      claimDate: input.claimDate,
      currency: input.currency || org.baseCurrency,
      exchangeRate: input.exchangeRate,
      paymentMethod: input.paymentMethod,
      merchantName: input.merchantName,
      projectId: input.projectId,
      purpose: input.purpose,
      notes: input.notes,
      items: input.items,
      userId: user.id,
      submitImmediately: input.submitImmediately,
    });

    return NextResponse.json({
      success: true,
      data: { id: claim.id, claimNumber: claim.claimNumber },
      warnings: violations.filter((v) => v.severity === 'WARNING'),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating expense claim:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create expense claim' }, { status: 500 });
  }
}
