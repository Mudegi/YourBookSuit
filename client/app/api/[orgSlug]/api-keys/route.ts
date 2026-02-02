import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash, randomBytes } from 'crypto';

// GET /api/[orgSlug]/api-keys - List API keys
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { orgSlug } = params;

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

    // Fetch API keys (exclude sensitive data)
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        organizationId: organization.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Remove key hash from response
    const sanitized = apiKeys.map(({ key, ...rest }) => rest);

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST /api/[orgSlug]/api-keys - Create new API key
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

    // Validate required fields
    const { name, permissions } = body;
    if (!name || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Name and permissions array are required' },
        { status: 400 }
      );
    }

    // Generate API key
    const keyValue = `ybk_${randomBytes(32).toString('hex')}`; // ybk_ prefix for YourBooks Key
    const hashedKey = createHash('sha256').update(keyValue).digest('hex');
    const prefix = keyValue.substring(0, 12); // First 12 chars for display

    // Create API key
    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: organization.id,
        name,
        key: hashedKey,
        prefix,
        permissions,
        rateLimit: body.rateLimit || 1000,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: true,
        createdBy: 'admin', // TODO: Get from session
      },
    });

    // Return API key ONLY ONCE - user must save it
    const { key: _, ...apiKeyData } = apiKey;
    
    return NextResponse.json({
      ...apiKeyData,
      key: keyValue, // Return unhashed key ONLY on creation
      warning: 'Save this key now. You will not be able to see it again!',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
