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

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { preferences: true },
      });
      return NextResponse.json({
        success: true,
        data: (dbUser?.preferences as Record<string, unknown>) ?? {},
      });
    } catch {
      // preferences column may not exist yet
      return NextResponse.json({ success: true, data: {} });
    }
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
    let existing: Record<string, unknown> = {};
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { preferences: true },
      });
      existing = (dbUser?.preferences as Record<string, unknown>) ?? {};
    } catch {
      // preferences column may not exist yet
    }
    const merged = { ...existing, ...sanitized };

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { preferences: merged },
      });
    } catch {
      // preferences column may not exist yet — silently skip
      return NextResponse.json({ success: true, data: sanitized });
    }

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    console.error('[PUT /api/user/preferences]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
