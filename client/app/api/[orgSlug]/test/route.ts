import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }
) {
  try {
    const params = 'then' in context.params ? await context.params : context.params;
    
    return NextResponse.json({
      success: true,
      message: 'API route is working',
      orgSlug: params.orgSlug,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
