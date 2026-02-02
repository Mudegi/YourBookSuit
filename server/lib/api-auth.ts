import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { getSessionFromHeaders, verifyToken } from './auth';
import { cookies } from 'next/headers';
import { UserRole } from '@prisma/client';

// Middleware to validate API keys for external system access
export async function validateApiKey(request: NextRequest): Promise<{
  valid: boolean;
  apiKey?: any;
  organization?: any;
  error?: string;
}> {
  // Get API key from Authorization header
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const apiKeyValue = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Hash the provided key to compare with stored hash
  const hashedKey = createHash('sha256').update(apiKeyValue).digest('hex');

  // Find API key in database
  const apiKey = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: {
      organization: true,
    },
  });

  if (!apiKey) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Check if key is active
  if (!apiKey.isActive) {
    return { valid: false, error: 'API key is inactive' };
  }

  // Check if key is expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // Check rate limit
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Count requests in the last hour (you'd implement this with Redis in production)
  // For now, we'll just update lastUsedAt
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    apiKey,
    organization: apiKey.organization,
  };
}

// Rate limiting helper (simplified - use Redis in production)
export async function checkRateLimit(apiKeyId: string, limit: number): Promise<boolean> {
  // In production, use Redis with sliding window
  // For now, return true (rate limit not exceeded)
  return true;
}

type AuthResult = {
  organizationId: string;
  userId: string;
  role: UserRole;
};

function makeError(message: string, status: number) {
  const err = new Error(message);
  // @ts-expect-error attach http status
  err.status = status;
  return err;
}

// Require an authenticated user for the given org (no permission checking)
export async function requireAuth(
  orgSlug: string
): Promise<AuthResult> {
  const session = await getSessionFromHeaders(headers() as unknown as Headers);

  let resolvedSession = session;

  // Fallback: check auth-token cookie directly if header-based session is missing
  if (!resolvedSession?.userId) {
    const cookieToken = cookies().get('auth-token')?.value;
    if (cookieToken) {
      const verified = await verifyToken(cookieToken);
      if (verified?.userId) {
        resolvedSession = verified as any;
      }
    }
  }

  // Dev bypass: allow local usage without auth when explicitly enabled
  if (!resolvedSession?.userId && process.env.DEV_BYPASS_AUTH === 'true') {
    const organization = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!organization) throw makeError('Organization not found', 404);
    const firstMember = await prisma.organizationUser.findFirst({
      where: { organizationId: organization.id, isActive: true },
      select: { userId: true, role: true },
    });
    resolvedSession = firstMember
      ? ({ userId: firstMember.userId, role: firstMember.role } as any)
      : ({ userId: 'dev-bypass', role: 'ADMIN' } as any);
  }

  if (!resolvedSession?.userId) {
    throw makeError('Unauthorized', 401);
  }

  const organization = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!organization) {
    throw makeError('Organization not found', 404);
  }

  const membership = await prisma.organizationUser.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: resolvedSession.userId,
      },
    },
    select: {
      role: true,
      isActive: true,
    },
  });

  if (!membership || !membership.isActive) {
    throw makeError('Forbidden', 403);
  }

  return {
    organizationId: organization.id,
    userId: resolvedSession.userId,
    role: membership.role,
  };
}

// Legacy function for backward compatibility
export async function requirePermission(
  orgSlug: string,
  _permission: any
): Promise<AuthResult> {
  return requireAuth(orgSlug);
}

// Verify authentication from request (for API routes)
export async function verifyAuth(request: NextRequest): Promise<{
  valid: boolean;
  userId?: string;
  organizationId?: string;
  role?: UserRole;
  error?: string;
}> {
  try {
    // Get token from cookies
    const token = request.cookies.get('auth-token')?.value;
    
    console.log('[verifyAuth] Token exists:', !!token);
    
    if (!token) {
      return { valid: false, error: 'No auth token' };
    }

    // Verify token
    const session = await verifyToken(token);
    
    console.log('[verifyAuth] Session:', session ? { userId: session.userId, email: session.email } : 'null');
    
    if (!session || !session.userId) {
      return { valid: false, error: 'Invalid token' };
    }

    // Get user with organization membership
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        organizations: {
          where: { isActive: true },
          include: {
            organization: true,
          },
          take: 1,
        },
      },
    });

    console.log('[verifyAuth] User found:', !!user, 'Org memberships:', user?.organizations.length || 0);

    if (!user || !user.organizations.length) {
      return { valid: false, error: 'No active organization' };
    }

    const membership = user.organizations[0];

    console.log('[verifyAuth] Success - orgId:', membership.organizationId, 'role:', membership.role);

    return {
      valid: true,
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
    };
  } catch (error) {
    console.error('[verifyAuth] Error:', error);
    return { valid: false, error: 'Authentication failed' };
  }
}
