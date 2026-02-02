import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chartOfAccountSchema } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    let organizationId = request.headers.get('x-organization-id');
    // Fallback: resolve organization by slug when header isn't present
    if (!organizationId) {
      const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
      if (!org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
      organizationId = org.id;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {
      organizationId,
    };

    if (type && type !== 'ALL') {
      where.accountType = type;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Fetch accounts
    const accounts = await prisma.chartOfAccount.findMany({
      where,
      orderBy: [
        { accountType: 'asc' },
        { code: 'asc' },
      ],
      include: {
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = chartOfAccountSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if code already exists
    const existingAccount = await prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        code: data.code,
      },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account code already exists' },
        { status: 400 }
      );
    }

    // Create account
    const account = await prisma.chartOfAccount.create({
      data: {
        organizationId,
        code: data.code,
        name: data.name,
        type: data.type,
        category: data.category,
        subCategory: data.subCategory,
        description: data.description,
        isActive: data.isActive ?? true,
        balance: 0,
        currency: data.currency || 'USD',
        createdById: userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
