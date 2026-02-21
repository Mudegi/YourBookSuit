import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.replace('Bearer ', '');
    
    // Fallback to cookie if no auth header
    if (!token) {
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => {
          const [key, ...v] = c.split('=');
          return [key, v.join('=')];
        })
      );
      token = cookies['yourbooks_token'] || cookies['auth-token'];
    }

    console.log('Session check - Token present:', !!token);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
    );
    
    const { payload } = await jwtVerify(token, secret);
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: payload.userId as string },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isSystemAdmin: true,
        },
      });
    } catch (error: any) {
      console.error('Prisma error:', error.message);
      throw error;
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get organization if present
    let organization = null;
    if (payload.organizationId) {
      organization = await prisma.organization.findUnique({
        where: { id: payload.organizationId as string },
        select: {
          id: true,
          name: true,
          slug: true,
          baseCurrency: true,
          onboardingCompleted: true,
          legalName: true,
          homeCountry: true,
          businessModel: true,
          subscriptionStatus: true,
          trialEndDate: true,
          subscriptionEndDate: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        user,
        organization,
        role: payload.role,
      },
    });
  } catch (error: any) {
    console.error('Session API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
