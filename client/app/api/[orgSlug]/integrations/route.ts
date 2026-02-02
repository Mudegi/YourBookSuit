import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

// Hash API credentials for secure storage
function hashCredential(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// GET /api/[orgSlug]/integrations - Get all integrations for organization
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { orgSlug } = params;
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

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

    if (status) {
      where.status = status;
    }

    // Fetch integrations (exclude sensitive data)
    const integrations = await prisma.integration.findMany({
      where,
      include: {
        _count: {
          select: {
            webhooks: true,
            syncLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Remove sensitive fields
    const sanitizedIntegrations = integrations.map(({ apiKey, apiSecret, webhookSecret, ...integration }) => integration);

    return NextResponse.json(sanitizedIntegrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

// POST /api/[orgSlug]/integrations - Create a new integration
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
    const { name, type, provider } = body;
    if (!name || !type || !provider) {
      return NextResponse.json(
        { error: 'Name, type, and provider are required' },
        { status: 400 }
      );
    }

    // Check if provider already exists
    const existingIntegration = await prisma.integration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: organization.id,
          provider,
        },
      },
    });

    if (existingIntegration) {
      return NextResponse.json(
        { error: 'Integration with this provider already exists' },
        { status: 409 }
      );
    }

    // Hash API credentials if provided
    const apiKey = body.apiKey ? hashCredential(body.apiKey) : null;
    const apiSecret = body.apiSecret ? hashCredential(body.apiSecret) : null;
    const webhookSecret = body.webhookSecret ? hashCredential(body.webhookSecret) : null;

    // Create integration
    const integration = await prisma.integration.create({
      data: {
        organizationId: organization.id,
        name,
        type,
        provider,
        status: body.status || 'PENDING',
        apiKey,
        apiSecret,
        webhookUrl: body.webhookUrl || null,
        webhookSecret,
        config: body.config || null,
        syncFrequency: body.syncFrequency || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    // Remove sensitive fields from response
    const { apiKey: _, apiSecret: __, webhookSecret: ___, ...sanitizedIntegration } = integration;

    return NextResponse.json(sanitizedIntegration, { status: 201 });
  } catch (error) {
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}
