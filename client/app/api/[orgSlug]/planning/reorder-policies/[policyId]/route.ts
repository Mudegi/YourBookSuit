/**
 * Individual Reorder Policy API Route  
 * Handles GET/PUT/DELETE /api/[orgSlug]/planning/reorder-policies/[policyId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; policyId: string } }
) {
  try {
    const { orgSlug, policyId } = params;

    console.log('GET Individual Reorder Policy:', { orgSlug, policyId });

    // Find organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      console.log('Organization not found:', orgSlug);
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Find policy
    const policy = await prisma.reorderPolicy.findUnique({
      where: {
        id: policyId,
        organizationId: organization.id,
      },
      include: {
        product: true,
      }
    });

    if (!policy) {
      console.log('Policy not found:', policyId);
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }

    console.log('Found policy for product:', policy.product.name);

    return NextResponse.json({
      success: true,
      data: policy,
    });

  } catch (error) {
    console.error('Error in GET /api/[orgSlug]/planning/reorder-policies/[policyId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgSlug: string; policyId: string } }
) {
  try {
    const { orgSlug, policyId } = params;
    const body = await request.json();

    console.log('PUT Individual Reorder Policy:', { orgSlug, policyId, body });

    // Find organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      console.log('Organization not found:', orgSlug);
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Update policy
    const policy = await prisma.reorderPolicy.update({
      where: {
        id: policyId,
        organizationId: organization.id,
      },
      data: {
        policyType: body.policyType,
        reorderPoint: body.reorderPoint,
        reorderQuantity: body.reorderQuantity,
        minQuantity: body.minQuantity,
        maxQuantity: body.maxQuantity,
        leadTimeDays: body.leadTimeDays,
        reviewCycleDays: body.reviewCycleDays,
        isActive: body.isActive,
        notes: body.notes,
      },
      include: {
        product: true,
      }
    });

    console.log('Updated policy for product:', policy.product.name);

    return NextResponse.json({
      success: true,
      data: policy,
    });

  } catch (error) {
    console.error('Error in PUT /api/[orgSlug]/planning/reorder-policies/[policyId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgSlug: string; policyId: string } }
) {
  try {
    const { orgSlug, policyId } = params;

    console.log('DELETE Individual Reorder Policy:', { orgSlug, policyId });

    // Find organization
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      console.log('Organization not found:', orgSlug);
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Delete policy
    const policy = await prisma.reorderPolicy.delete({
      where: {
        id: policyId,
        organizationId: organization.id,
      },
    });

    console.log('Deleted policy:', policyId);

    return NextResponse.json({
      success: true,
      data: { id: policyId },
    });

  } catch (error) {
    console.error('Error in DELETE /api/[orgSlug]/planning/reorder-policies/[policyId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}