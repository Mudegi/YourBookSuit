/**
 * Authentication utilities for Next.js API routes
 * Handles JWT creation/verification and password hashing
 */

import { cookies, headers } from 'next/headers';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
);

const JWT_ALGORITHM = 'HS256';

export interface SessionPayload extends JWTPayload {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**\n * Hash a password using bcrypt
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

export async function getCurrentUser(): Promise<User | null> {
  try {
    let token: string | undefined;
    
    // First try Authorization header
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Fallback to cookie
    if (!token) {
      const cookieStore = cookies();
      token = cookieStore.get('yourbooks_token')?.value || cookieStore.get('token')?.value || cookieStore.get('auth-token')?.value;
    }

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    return {
      id: payload.userId as string,
      email: payload.email as string,
      firstName: payload.firstName as string || '',
      lastName: payload.lastName as string || '',
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Get user ID from token
 */
export async function getUserIdFromToken(token: string): Promise<string | null> {
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

/**
 * Get session from request headers
 */
export async function getSessionFromHeaders(
  headersObj: Headers
): Promise<any | null> {
  try {
    const authHeader = headersObj.get('authorization');
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token) {
      const cookieStore = cookies();
      token = cookieStore.get('auth-token')?.value || cookieStore.get('yourbooks_token')?.value;
    }

    if (!token) {
      return null;
    }

    return await verifyToken(token);
  } catch (error) {
    return null;
  }
}
