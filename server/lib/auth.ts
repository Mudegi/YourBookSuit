/**
 * Authentication Utilities
 * Handles JWT token generation, verification, and password hashing
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { headers, cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const JWT_ALGORITHM = 'HS256';

export type SessionPayload = JWTPayload & {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
};

export type SessionData = SessionPayload & {
  iat: number;
  exp: number;
};

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a JWT token for a user session
 */
export async function createToken(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    });

    return payload as unknown as SessionData;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

/**
 * Get session from request headers
 */
export async function getSessionFromHeaders(
  headers: Headers
): Promise<SessionData | null> {
  const headerUserId = headers.get('x-user-id');
  if (headerUserId) {
    return {
      userId: headerUserId,
      email: headers.get('x-user-email') || '',
      organizationId: headers.get('x-organization-id') || undefined,
      role: headers.get('x-user-role') || undefined,
      iat: 0,
      exp: 0,
    } as SessionData;
  }

  const authHeader = headers.get('authorization');
  const token = extractTokenFromHeader(authHeader || undefined);

  // Fallback to auth-token cookie when Authorization is missing
  let sessionToken = token;
  if (!sessionToken) {
    const cookieStore = cookies();
    const cookieToken = cookieStore.get('auth-token')?.value;
    if (cookieToken) sessionToken = cookieToken;
  }

  if (!sessionToken) return null;

  return verifyToken(sessionToken);
}

/**
 * Resolve current authenticated user from request headers
 */
export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  try {
    const h = headers();
    // Prefer middleware-injected headers if present
    const headerUserId = h.get('x-user-id');
    const headerUserEmail = h.get('x-user-email');

    if (headerUserId) {
      // Return minimal info when middleware provided context
      return { id: headerUserId, email: headerUserEmail || '' };
    }

    // Fallback to Authorization header (Bearer token)
    const session = await getSessionFromHeaders(h as unknown as Headers);
    if (!session?.userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true },
    });
    return user;
  } catch {
    return null;
  }
}

// API route helper - simplified auth verification
export async function verifyAuth(request: any): Promise<SessionPayload | null> {
  try {
    // Get token from cookies
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }

    // Verify token
    const session = await verifyToken(token);
    
    if (!session || !session.userId) {
      return null;
    }

    return {
      userId: session.userId,
      email: session.email,
      organizationId: session.organizationId,
      role: session.role
    };
  } catch {
    return null;
  }
}
