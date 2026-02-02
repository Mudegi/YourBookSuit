import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const orgSlug = params.orgSlug;

    // Get organization ID from slug
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Fetch all active units of measure ordered by category and name
    const units = await prisma.unitOfMeasure.findMany({
      where: {
        organizationId: org.id,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        abbreviation: true,
        category: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(units);
  } catch (error) {
    console.error('Error fetching units of measure:', error);
    return NextResponse.json(
      { error: 'Failed to fetch units of measure' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const orgSlug = params.orgSlug;

    // Get organization ID from slug
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { code, name, abbreviation, category } = body;

    // Validate required fields
    if (!code || !name || !abbreviation) {
      return NextResponse.json(
        { error: 'Code, name, and abbreviation are required' },
        { status: 400 }
      );
    }

    // Check if code already exists for this organization
    const existing = await prisma.unitOfMeasure.findFirst({
      where: {
        organizationId: org.id,
        code: code.toLowerCase(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Unit code already exists for this organization' },
        { status: 409 }
      );
    }

    // Create the new unit
    const unit = await prisma.unitOfMeasure.create({
      data: {
        organizationId: org.id,
        code: code.toLowerCase(),
        name,
        abbreviation,
        category: category || 'other',
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        abbreviation: true,
        category: true,
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    console.error('Error creating unit of measure:', error);
    return NextResponse.json(
      { error: 'Failed to create unit of measure' },
      { status: 500 }
    );
  }
}
