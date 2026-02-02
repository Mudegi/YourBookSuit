import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Zod schema for vendor update
const vendorUpdateSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  taxId: z.string().optional().nullable(),
  
  contactPerson: z.string().optional().nullable(),
  contactEmail: z.string().email('Invalid contact email').optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  
  billingAddress: z.string().optional().nullable(),
  billingCity: z.string().optional().nullable(),
  billingState: z.string().optional().nullable(),
  billingPostalCode: z.string().optional().nullable(),
  billingCountry: z.string().optional().nullable(),
  
  paymentTerms: z.enum([
    'DUE_ON_RECEIPT',
    'NET_15',
    'NET_30',
    'NET_60',
    'NET_90'
  ]).optional(),
  
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/orgs/[orgSlug]/vendors/[id]
 * Get a single vendor by ID with recent bills
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const vendor = await prisma.vendor.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        bills: {
          orderBy: { billDate: 'desc' },
          take: 10,
          include: {
            transaction: {
              select: {
                id: true,
                transactionNumber: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: { bills: true },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Calculate totalOwed and totalPaid
    const totalOwed = vendor.bills
      .filter((bill) => bill.status === 'SENT' || bill.status === 'OVERDUE')
      .reduce((sum, bill) => sum + bill.totalAmount, 0);

    const totalPaid = vendor.bills
      .filter((bill) => bill.status === 'PAID')
      .reduce((sum, bill) => sum + bill.totalAmount, 0);

    return NextResponse.json({
      ...vendor,
      totalOwed,
      totalPaid,
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orgs/[orgSlug]/vendors/[id]
 * Update an existing vendor
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Organization or user not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = vendorUpdateSchema.parse(body);

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Check if email is unique (if being updated)
    if (validatedData.email && validatedData.email !== existingVendor.email) {
      const duplicateVendor = await prisma.vendor.findFirst({
        where: {
          organizationId,
          email: validatedData.email,
          id: { not: params.id },
        },
      });

      if (duplicateVendor) {
        return NextResponse.json(
          { error: 'A vendor with this email already exists' },
          { status: 400 }
        );
      }
    }

    const vendor = await prisma.vendor.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        updatedBy: userId,
      },
    });

    return NextResponse.json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orgs/[orgSlug]/vendors/[id]
 * Delete a vendor (only if no bills exist)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if vendor has any bills
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        _count: {
          select: { bills: true },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    if (vendor._count.bills > 0) {
      return NextResponse.json(
        { error: `Cannot delete vendor with ${vendor._count.bills} bill(s). Mark as inactive instead.` },
        { status: 400 }
      );
    }

    await prisma.vendor.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}
