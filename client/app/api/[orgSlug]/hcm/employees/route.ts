import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Permission } from '@/lib/permissions';
import { z } from 'zod';

const employeeSchema = z.object({
  employeeNumber: z.string().min(1),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  hireDate: z.coerce.date(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RETIRED']).default('ACTIVE'),
  jobTitleId: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  managerId: z.string().optional(),
  workLocation: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN']).default('FULL_TIME'),
  payrollCurrency: z.string().default('USD'),
  baseSalary: z.number().optional(),
  payFrequency: z.enum(['WEEKLY', 'BI_WEEKLY', 'SEMI_MONTHLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']).default('MONTHLY'),
  taxIdNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/[orgSlug]/hcm/employees
export async function GET(_req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.VIEW_EMPLOYEES);

    const employees = await prisma.employee.findMany({
      where: { organizationId: org.id },
      include: {
        department: { select: { id: true, code: true, name: true } },
        jobTitle: { select: { id: true, title: true } },
        position: { select: { id: true, positionNumber: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { employeeNumber: 'asc' },
      take: 500,
    });

    const data = employees.map((e) => ({
      id: e.id,
      employeeNumber: e.employeeNumber,
      firstName: e.firstName,
      middleName: e.middleName,
      lastName: e.lastName,
      email: e.email,
      phone: e.phone,
      hireDate: e.hireDate,
      status: e.status,
      employmentType: e.employmentType,
      departmentName: e.department?.name,
      jobTitle: e.jobTitle?.title,
      managerName: e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : null,
      baseSalary: e.baseSalary ? Number(e.baseSalary) : null,
      isActive: e.isActive,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing employees:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch employees' }, { status: 500 });
  }
}

// POST /api/[orgSlug]/hcm/employees
export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, Permission.MANAGE_EMPLOYEES);

    const body = await request.json();
    const parsed = employeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;

    // Check for duplicate employee number
    const existing = await prisma.employee.findFirst({
      where: { organizationId: org.id, employeeNumber: input.employeeNumber },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'Employee number already exists' }, { status: 400 });
    }

    const created = await prisma.employee.create({
      data: {
        organizationId: org.id,
        employeeNumber: input.employeeNumber,
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        dateOfBirth: input.dateOfBirth,
        hireDate: input.hireDate,
        status: input.status,
        jobTitleId: input.jobTitleId,
        departmentId: input.departmentId,
        positionId: input.positionId,
        managerId: input.managerId,
        workLocation: input.workLocation,
        employmentType: input.employmentType,
        payrollCurrency: input.payrollCurrency,
        baseSalary: input.baseSalary,
        payFrequency: input.payFrequency,
        taxIdNumber: input.taxIdNumber,
        bankAccountNumber: input.bankAccountNumber,
        bankName: input.bankName,
        address: input.address,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
        emergencyContact: input.emergencyContact,
        emergencyPhone: input.emergencyPhone,
        notes: input.notes,
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ success: false, error: 'Failed to create employee' }, { status: 500 });
  }
}
