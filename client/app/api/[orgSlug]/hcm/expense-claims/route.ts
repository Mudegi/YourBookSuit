import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';
import { z } from 'zod';

const expenseItemSchema = z.object({
  expenseDate: z.coerce.date(),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

const expenseClaimSchema = z.object({
  employeeId: z.string().min(1),
  claimDate: z.coerce.date(),
  currency: z.string().default('USD'),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(expenseItemSchema).min(1),
});

// GET /api/[orgSlug]/hcm/expense-claims
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_EXPENSES);

    const claims = await prisma.expenseClaim.findMany({
      where: { employee: { organizationId: org.id } },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
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
      claimDate: c.claimDate,
      totalAmount: Number(c.totalAmount),
      currency: c.currency,
      status: c.status,
      purpose: c.purpose,
      approvedBy: c.approver ? `${c.approver.firstName} ${c.approver.lastName}` : null,
      approvedAt: c.approvedAt,
      paidAt: c.paidAt,
      itemCount: c.items.length,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ success: true, data });
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
    ensurePermission(membership.role, Permission.SUBMIT_EXPENSES);

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

    // Generate claim number
    const count = await prisma.expenseClaim.count({
      where: { employee: { organizationId: org.id } },
    });
    const claimNumber = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Calculate total
    const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0);

    const created = await prisma.expenseClaim.create({
      data: {
        employeeId: input.employeeId,
        claimNumber,
        claimDate: input.claimDate,
        totalAmount,
        currency: input.currency,
        purpose: input.purpose,
        notes: input.notes,
        status: 'DRAFT',
        items: {
          create: input.items.map((item) => ({
            expenseDate: item.expenseDate,
            category: item.category,
            description: item.description,
            amount: item.amount,
            receiptUrl: item.receiptUrl,
            notes: item.notes,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id, claimNumber } }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense claim:', error);
    return NextResponse.json({ success: false, error: 'Failed to create expense claim' }, { status: 500 });
  }
}
