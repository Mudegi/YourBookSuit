import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

/**
 * GET /api/orgs/[orgSlug]/settings/efris
 * Get EFRIS configuration for the organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const config = await prisma.eInvoiceConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      return NextResponse.json({
        success: true,
        config: null,
      });
    }

    // Don't expose sensitive data
    const credentials = config.credentials as any || {};
    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        provider: config.provider,
        apiEndpoint: config.apiEndpoint,
        efrisApiKey: credentials.efrisApiKey,
        efrisDeviceNo: credentials.efrisDeviceNo,
        efrisTIN: credentials.efrisTIN,
        efrisTestMode: credentials.efrisTestMode || false,
        isActive: config.isActive,
      },
    });
  } catch (error) {
    console.error('Error fetching EFRIS config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgSlug]/settings/efris
 * Create or update EFRIS configuration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { organizationId } = await requireAuth(params.orgSlug);

    const body = await request.json();

    // Validate required fields
    if (!body.apiEndpoint || !body.efrisApiKey) {
      return NextResponse.json(
        { error: 'API endpoint and API key are required' },
        { status: 400 }
      );
    }

    // Check if config exists
    const existingConfig = await prisma.eInvoiceConfig.findUnique({
      where: { organizationId },
    });

    const configData = {
      provider: 'EFRIS',
      apiEndpoint: body.apiEndpoint,
      credentials: {
        efrisApiKey: body.efrisApiKey,
        efrisDeviceNo: body.efrisDeviceNo || null,
        efrisTIN: body.efrisTIN || null,
        efrisTestMode: body.efrisTestMode ?? true,
        ...(body.efrisApiSecret ? { apiSecret: body.efrisApiSecret } : {}),
      },
      isActive: body.isActive ?? false,
    };

    let config;
    if (existingConfig) {
      // Update existing config
      config = await prisma.eInvoiceConfig.update({
        where: { organizationId },
        data: configData,
      });
    } else {
      // Create new config
      config = await prisma.eInvoiceConfig.create({
        data: {
          ...configData,
          organizationId,
          country: 'UG', // Uganda
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'EFRIS configuration saved successfully',
      config: {
        id: config.id,
        provider: config.provider,
        apiEndpoint: config.apiEndpoint,
        isActive: config.isActive,
      },
    });
  } catch (error) {
    console.error('Error saving EFRIS config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
