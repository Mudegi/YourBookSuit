import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  employeeNumber: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  middleName: z.string().nullable().optional(),
  lastName: z.string().min(1).optional(),
  gender: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  nationalId: z.string().nullable().optional(),
  socialSecurityNo: z.string().nullable().optional(),
  hireDate: z.coerce.date().optional(),
  probationEndDate: z.coerce.date().nullable().optional(),
  terminationDate: z.coerce.date().nullable().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RETIRED']).optional(),
  jobTitleId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
  positionId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  workLocation: z.string().nullable().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN']).optional(),
  payrollCurrency: z.string().optional(),
  baseSalary: z.number().nullable().optional(),
  payFrequency: z.enum(['WEEKLY', 'BI_WEEKLY', 'SEMI_MONTHLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']).optional(),
  taxIdNumber: z.string().nullable().optional(),
  bankAccountNumber: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankBranch: z.string().nullable().optional(),
  bankSortCode: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  localVillage: z.string().nullable().optional(),
  localParish: z.string().nullable().optional(),
  localDistrict: z.string().nullable().optional(),
  localRegion: z.string().nullable().optional(),
  nextOfKinName: z.string().nullable().optional(),
  nextOfKinPhone: z.string().nullable().optional(),
  nextOfKinRelation: z.string().nullable().optional(),
  emergencyContact: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// GET /api/[orgSlug]/hcm/employees/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'read');

    // Try full query; fall back if branch relation not yet migrated
    let employee: any = null;
    try {
      employee = await (prisma.employee as any).findFirst({
        where: { id: params.id, organizationId: org.id },
        include: {
          department: { select: { id: true, code: true, name: true } },
          branch: { select: { id: true, code: true, name: true } },
          jobTitle: { select: { id: true, title: true } },
          position: { select: { id: true, positionNumber: true } },
          manager: { select: { id: true, firstName: true, lastName: true, employeeNumber: true, email: true } },
          directReports: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true, status: true, jobTitle: { select: { title: true } } },
            take: 50,
          },
          user: { select: { id: true, email: true, isActive: true, lastLoginAt: true } },
          leaveRequests: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, status: true, startDate: true, endDate: true, createdAt: true },
          },
        },
      });
    } catch {
      employee = await prisma.employee.findFirst({
        where: { id: params.id, organizationId: org.id },
        include: {
          department: { select: { id: true, code: true, name: true } },
          jobTitle: { select: { id: true, title: true } },
          position: { select: { id: true, positionNumber: true } },
          manager: { select: { id: true, firstName: true, lastName: true, employeeNumber: true, email: true } },
          directReports: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true, status: true, jobTitle: { select: { title: true } } },
            take: 50,
          },
          user: { select: { id: true, email: true, isActive: true, lastLoginAt: true } },
          leaveRequests: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, status: true, startDate: true, endDate: true, createdAt: true },
          },
        },
      });
      if (employee) employee.branch = null;
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

// PUT /api/[orgSlug]/hcm/employees/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'update');

    const employee = await prisma.employee.findFirst({
      where: { id: params.id, organizationId: org.id },
      include: { user: { select: { id: true } } },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;
    const prevStatus = employee.status;

    // Check for duplicate employee number if changed
    if (input.employeeNumber && input.employeeNumber !== employee.employeeNumber) {
      const dup = await prisma.employee.findFirst({
        where: { organizationId: org.id, employeeNumber: input.employeeNumber, id: { not: params.id } },
      });
      if (dup) return NextResponse.json({ error: 'Employee number already exists' }, { status: 400 });
    }

    // Build update data — only include provided fields
    const updateData: any = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        updateData[key] = value === '' ? null : value;
      }
    }

    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: updateData,
    });

    // Integration Hook: If status changed to TERMINATED or RETIRED, deactivate linked user account
    if (
      (input.status === 'TERMINATED' || input.status === 'RETIRED') &&
      prevStatus !== 'TERMINATED' &&
      prevStatus !== 'RETIRED' &&
      employee.userId
    ) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: { isActive: false },
      });

      // Also deactivate their org membership
      await prisma.organizationUser.updateMany({
        where: { userId: employee.userId, organizationId: org.id },
        data: { isActive: false },
      });

      console.log(`[HCM] Deactivated user account ${employee.userId} due to employee ${input.status}`);
    }

    // If status changes back to ACTIVE and has a linked user, re-activate
    if (
      input.status === 'ACTIVE' &&
      (prevStatus === 'TERMINATED' || prevStatus === 'RETIRED' || prevStatus === 'SUSPENDED') &&
      employee.userId
    ) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: { isActive: true },
      });
      await prisma.organizationUser.updateMany({
        where: { userId: employee.userId, organizationId: org.id },
        data: { isActive: true },
      });
    }

    // Set terminationDate automatically
    if ((input.status === 'TERMINATED' || input.status === 'RETIRED') && !input.terminationDate) {
      await prisma.employee.update({
        where: { id: params.id },
        data: { terminationDate: new Date(), isActive: false },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'EMPLOYEE',
        entityId: params.id,
        changes: {
          updatedFields: Object.keys(input),
          ...(input.status && prevStatus !== input.status ? { statusChange: `${prevStatus} → ${input.status}` } : {}),
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

// DELETE /api/[orgSlug]/hcm/employees/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'delete');

    const employee = await prisma.employee.findFirst({
      where: { id: params.id, organizationId: org.id },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await prisma.employee.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'DELETE',
        entityType: 'EMPLOYEE',
        entityId: params.id,
        changes: { employeeNumber: employee.employeeNumber, name: `${employee.firstName} ${employee.lastName}` },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
