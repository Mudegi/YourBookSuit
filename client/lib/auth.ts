/**
 * Authentication utilities for Next.js API routes
 */

import { cookies, headers } from 'next/headers';
import { jwtVerify } from 'jose';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Get current authenticated user from request
 */
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

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'your-secret-key'
    );

    const { payload } = await jwtVerify(token, secret);

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
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'your-secret-key'
    );
    const { payload } = await jwtVerify(token, secret);
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
