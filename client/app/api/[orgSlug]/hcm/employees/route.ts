import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensurePermission, requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const employeeSchema = z.object({
  employeeNumber: z.string().min(1),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  gender: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  nationalId: z.string().optional(),
  socialSecurityNo: z.string().optional(),
  hireDate: z.coerce.date(),
  probationEndDate: z.coerce.date().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RETIRED']).default('ACTIVE'),
  jobTitleId: z.string().optional(),
  departmentId: z.string().optional(),
  branchId: z.string().optional(),
  positionId: z.string().optional(),
  managerId: z.string().optional(),
  userId: z.string().optional(),
  workLocation: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN']).default('FULL_TIME'),
  payrollCurrency: z.string().optional(),
  baseSalary: z.number().optional(),
  payFrequency: z.enum(['WEEKLY', 'BI_WEEKLY', 'SEMI_MONTHLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']).default('MONTHLY'),
  taxIdNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankSortCode: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  localVillage: z.string().optional(),
  localParish: z.string().optional(),
  localDistrict: z.string().optional(),
  localRegion: z.string().optional(),
  nextOfKinName: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
  nextOfKinRelation: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/[orgSlug]/hcm/employees
export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'read');

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const branchId = searchParams.get('branchId');
    const employmentType = searchParams.get('employmentType');

    const where: any = { organizationId: org.id };
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (branchId) where.branchId = branchId;
    if (employmentType) where.employmentType = employmentType;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Try with full includes; fall back if new columns not yet migrated
    let employees: any[];
    try {
      employees = await prisma.employee.findMany({
        where,
        include: {
          department: { select: { id: true, code: true, name: true } },
          branch: { select: { id: true, code: true, name: true } },
          jobTitle: { select: { id: true, title: true } },
          position: { select: { id: true, positionNumber: true } },
          manager: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
          user: { select: { id: true, email: true, isActive: true } },
        },
        orderBy: [{ status: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
        take: 500,
      });
    } catch {
      // Fallback: query without branch relation (pre-migration)
      employees = await prisma.employee.findMany({
        where: { organizationId: org.id, ...(status ? { status } : {}), ...(departmentId ? { departmentId } : {}), ...(employmentType ? { employmentType } : {}) },
        include: {
          department: { select: { id: true, code: true, name: true } },
          jobTitle: { select: { id: true, title: true } },
          position: { select: { id: true, positionNumber: true } },
          manager: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
          user: { select: { id: true, email: true, isActive: true } },
        },
        orderBy: [{ status: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
        take: 500,
      });
    }

    // Compute summary metrics
    let metrics = { total: 0, active: 0, onLeave: 0, terminated: 0, suspended: 0 };
    try {
      const allEmployees = await prisma.employee.groupBy({
        by: ['status'],
        where: { organizationId: org.id },
        _count: { id: true },
      });
      metrics = {
        total: allEmployees.reduce((s, g) => s + g._count.id, 0),
        active: allEmployees.find((g) => g.status === 'ACTIVE')?._count.id || 0,
        onLeave: allEmployees.find((g) => g.status === 'ON_LEAVE')?._count.id || 0,
        terminated: allEmployees.find((g) => g.status === 'TERMINATED')?._count.id || 0,
        suspended: allEmployees.find((g) => g.status === 'SUSPENDED')?._count.id || 0,
      };
    } catch {}

    const data = employees.map((e: any) => ({
      id: e.id,
      employeeNumber: e.employeeNumber,
      firstName: e.firstName,
      middleName: e.middleName || null,
      lastName: e.lastName,
      gender: e.gender || null,
      email: e.email,
      phone: e.phone,
      whatsapp: e.whatsapp || null,
      profileImage: e.profileImage || null,
      hireDate: e.hireDate,
      status: e.status,
      employmentType: e.employmentType,
      department: e.department || null,
      branch: e.branch || null,
      jobTitle: e.jobTitle?.title || null,
      managerName: e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : null,
      managerId: e.managerId,
      hasUserAccount: !!e.user,
      userIsActive: e.user?.isActive ?? null,
      isActive: e.isActive,
    }));

    return NextResponse.json({ success: true, data, metrics });
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
    ensurePermission(membership.role, 'create');

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

    // Verify branch if provided
    if (input.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: input.branchId, organizationId: org.id },
      });
      if (!branch) return NextResponse.json({ success: false, error: 'Branch not found' }, { status: 400 });
    }

    // Verify department if provided
    if (input.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: input.departmentId, organizationId: org.id },
      });
      if (!dept) return NextResponse.json({ success: false, error: 'Department not found' }, { status: 400 });
    }

    const created = await prisma.employee.create({
      data: {
        organizationId: org.id,
        employeeNumber: input.employeeNumber,
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        gender: input.gender,
        email: input.email || null,
        phone: input.phone,
        whatsapp: input.whatsapp,
        dateOfBirth: input.dateOfBirth,
        nationalId: input.nationalId,
        socialSecurityNo: input.socialSecurityNo,
        hireDate: input.hireDate,
        probationEndDate: input.probationEndDate,
        status: input.status,
        jobTitleId: input.jobTitleId || null,
        departmentId: input.departmentId || null,
        branchId: input.branchId || null,
        positionId: input.positionId || null,
        managerId: input.managerId || null,
        userId: input.userId || null,
        workLocation: input.workLocation,
        employmentType: input.employmentType,
        payrollCurrency: input.payrollCurrency || org.baseCurrency,
        baseSalary: input.baseSalary,
        payFrequency: input.payFrequency,
        taxIdNumber: input.taxIdNumber,
        bankAccountNumber: input.bankAccountNumber,
        bankName: input.bankName,
        bankBranch: input.bankBranch,
        bankSortCode: input.bankSortCode,
        address: input.address,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
        localVillage: input.localVillage,
        localParish: input.localParish,
        localDistrict: input.localDistrict,
        localRegion: input.localRegion,
        nextOfKinName: input.nextOfKinName,
        nextOfKinPhone: input.nextOfKinPhone,
        nextOfKinRelation: input.nextOfKinRelation,
        emergencyContact: input.emergencyContact,
        emergencyPhone: input.emergencyPhone,
        notes: input.notes,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'CREATE',
        entityType: 'EMPLOYEE',
        entityId: created.id,
        changes: { employeeNumber: input.employeeNumber, name: `${input.firstName} ${input.lastName}` },
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ success: false, error: 'Failed to create employee' }, { status: 500 });
  }
}
