import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { getLeaveBalances } from '@/services/leaveService';

// GET /api/[orgSlug]/hcm/leave-balances?employeeId=xxx&year=2024
export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const { searchParams } = req.nextUrl;
    const employeeId = searchParams.get('employeeId');
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    // Verify employee belongs to this org
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId: org.id },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const balances = await getLeaveBalances(employeeId, org.id, year);

    return NextResponse.json({
      success: true,
      data: {
        employee,
        year,
        balances,
        totalAllotment: balances.reduce((s, b) => s + b.annualAllotment, 0),
        totalUsed: balances.reduce((s, b) => s + b.usedDays, 0),
        totalPending: balances.reduce((s, b) => s + b.pendingDays, 0),
        totalRemaining: balances.reduce((s, b) => s + b.effectiveBalance, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching leave balances:', error);
    return NextResponse.json({ error: 'Failed to fetch leave balances' }, { status: 500 });
  }
}
