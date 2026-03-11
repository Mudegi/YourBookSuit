import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = ['theme', 'fontFamily', 'density'];

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { preferences: true },
    });

    return NextResponse.json({
      success: true,
      data: (dbUser?.preferences as Record<string, unknown>) ?? {},
    });
  } catch (error) {
    console.error('[GET /api/user/preferences]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Only allow known preference keys
    const sanitized: Record<string, string> = {};
    for (const key of ALLOWED_KEYS) {
      if (typeof body[key] === 'string' && body[key].length <= 100) {
        sanitized[key] = body[key];
      }
    }

    // Merge with existing preferences
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { preferences: true },
    });

    const existing = (dbUser?.preferences as Record<string, unknown>) ?? {};
    const merged = { ...existing, ...sanitized };

    await prisma.user.update({
      where: { id: user.id },
      data: { preferences: merged },
    });

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    console.error('[PUT /api/user/preferences]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
