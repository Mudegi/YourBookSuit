import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { BranchSettingsService } from '@/lib/branch-settings.service';

// GET /api/[orgSlug]/branches - Get all branches for organization
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { orgSlug } = params;
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const type = searchParams.get('type');

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check permissions - users can only see branches in their organization
    // Additional branch-level permissions can be added here if needed

    // Build query filters
    const where: any = {
      organizationId: organization.id,
    };

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    if (type) {
      where.type = type;
    }

    // Fetch branches with effective settings
    const branches = await BranchSettingsService.getBranchesWithSettings(organization.id);

    // Apply filters
    let filteredBranches = branches;
    if (isActive !== null) {
      filteredBranches = branches.filter(b => b.isActive === (isActive === 'true'));
    }
    if (type) {
      filteredBranches = filteredBranches.filter(b => b.type === type);
    }

    return NextResponse.json(filteredBranches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
      { status: 500 }
    );
  }
}

// POST /api/[orgSlug]/branches - Create a new branch
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { orgSlug } = params;
    const body = await request.json();

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check permissions - only organization admins can create branches
    // For now, we'll assume the user is authenticated and in the org
    // TODO: Add proper permission check for BRANCHES.CREATE

    // Validate required fields
    const { code, name, type } = body;
    if (!code || !name || !type) {
      return NextResponse.json(
        { error: 'Code, name, and type are required' },
        { status: 400 }
      );
    }

    // Validate headquarters constraint
    if (body.isHeadquarters) {
      await BranchSettingsService.validateBranchCreation(organization.id, true);
    }

    // Check if code already exists
    const existingBranch = await prisma.branch.findUnique({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code,
        },
      },
    });

    if (existingBranch) {
      return NextResponse.json(
        { error: 'Branch code already exists' },
        { status: 409 }
      );
    }

    // Create branch with inheritance defaults
    const branch = await prisma.branch.create({
      data: {
        organizationId: organization.id,
        code,
        name,
        type,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        country: body.country || organization.homeCountry, // Inherit from org
        postalCode: body.postalCode || null,
        phone: body.phone || null,
        email: body.email || null,
        managerId: body.managerId || null,
        isHeadquarters: body.isHeadquarters || false,
        isActive: body.isActive !== undefined ? body.isActive : true,
        openingDate: body.openingDate ? new Date(body.openingDate) : new Date(),
        closingDate: body.closingDate ? new Date(body.closingDate) : null,
        taxIdNumber: body.taxIdNumber || null,
        currency: body.currency || organization.baseCurrency, // Inherit from org
        timezone: body.timezone || 'UTC',
        prefix: body.prefix || '',
        metadata: body.metadata || null,
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create branch' },
      { status: 500 }
    );
  }
}
