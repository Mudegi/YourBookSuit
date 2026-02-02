import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { EfrisApiService } from '@/lib/services/efris/efris-api.service';

/**
 * POST /api/orgs/[orgSlug]/settings/efris/test
 * Test EFRIS API connection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    await requireAuth(params.orgSlug);

    const body = await request.json();

    if (!body.apiEndpoint || !body.apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'API endpoint and API key are required' 
        },
        { status: 400 }
      );
    }

    // Create a temporary EFRIS service instance
    const efrisService = new EfrisApiService({
      apiBaseUrl: body.apiEndpoint,
      apiKey: body.apiKey,
      enabled: true,
    });

    // Test the connection
    const result = await efrisService.testConnection();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('EFRIS connection test error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Connection test failed',
    });
  }
}
