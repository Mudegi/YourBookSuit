import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BranchSettingsService } from '@/lib/branch-settings.service';

// GET /api/[orgSlug]/branches/[id] - Get a specific branch
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { orgSlug, id } = params;

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

    // Fetch branch with effective settings
    const branches = await BranchSettingsService.getBranchesWithSettings(organization.id);
    const branch = branches.find(b => b.id === id);

    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }

    // Get detailed branch settings
    const settings = await BranchSettingsService.getBranchSettings(id);

    return NextResponse.json({
      ...branch,
      settings,
    });
  } catch (error) {
    console.error('Error fetching branch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branch' },
      { status: 500 }
    );
  }
}

// PATCH /api/[orgSlug]/branches/[id] - Update a branch
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { orgSlug, id } = params;
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

    // Check if branch exists
    const existingBranch = await prisma.branch.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingBranch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }

    // Validate headquarters changes
    if (body.isHeadquarters !== undefined) {
      if (body.isHeadquarters && !existingBranch.isHeadquarters) {
        // Setting as headquarters - validate no other HQ exists
        await BranchSettingsService.validateBranchCreation(organization.id, true);
      } else if (!body.isHeadquarters && existingBranch.isHeadquarters) {
        // Removing headquarters status - validate it's not the only one
        await BranchSettingsService.validateBranchUpdate(id, { isHeadquarters: false });
      }
    }

    // Check if code is being changed and if it already exists
    if (body.code && body.code !== existingBranch.code) {
      const codeExists = await prisma.branch.findUnique({
        where: {
          organizationId_code: {
            organizationId: organization.id,
            code: body.code,
          },
        },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: 'Branch code already exists' },
          { status: 409 }
        );
      }
    }

    // Update branch
    const updateData: any = {};

    if (body.code !== undefined) updateData.code = body.code;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.managerId !== undefined) updateData.managerId = body.managerId;
    if (body.isHeadquarters !== undefined) updateData.isHeadquarters = body.isHeadquarters;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.openingDate !== undefined) updateData.openingDate = body.openingDate ? new Date(body.openingDate) : null;
    if (body.closingDate !== undefined) updateData.closingDate = body.closingDate ? new Date(body.closingDate) : null;
    if (body.taxIdNumber !== undefined) updateData.taxIdNumber = body.taxIdNumber;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    const branch = await prisma.branch.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(branch);
  } catch (error) {
    console.error('Error updating branch:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update branch' },
      { status: 500 }
    );
  }
}

// DELETE /api/[orgSlug]/branches/[id] - Delete a branch (soft delete - mark as inactive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const { orgSlug, id } = params;

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

    // Check if branch exists
    const existingBranch = await prisma.branch.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingBranch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }

    // Validate deletion - prevent deleting headquarters
    await BranchSettingsService.validateBranchDeletion(id);

    // Check if branch has any transactions
    const transactionCount = await prisma.transaction.count({
      where: { branchId: id },
    });

    if (transactionCount > 0) {
      // Soft delete - mark as inactive
      const branch = await prisma.branch.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: 'Branch deactivated (has associated transactions)',
        branch,
      });
    } else {
      // Hard delete - no transactions
      await prisma.branch.delete({
        where: { id },
      });

      return NextResponse.json({
        message: 'Branch deleted successfully',
      });
    }
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete branch' },
      { status: 500 }
    );
  }
}
