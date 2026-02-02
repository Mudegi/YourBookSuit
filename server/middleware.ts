/**
 * Next.js Middleware
 * Handles authentication, organization context, and onboarding guards
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/',
  '/about',
  '/features',
  '/pricing',
  '/pricing/comparison',
  '/contact',
];

// API routes that don't require authentication
const PUBLIC_API_ROUTES = ['/api/auth/login', '/api/auth/register'];

// Routes that don't require onboarding completion
const ONBOARDING_ROUTES = ['/onboarding'];

// API routes for onboarding
const ONBOARDING_API_ROUTES = ['/api/onboarding'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname) || PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to login for web pages
    if (!pathname.startsWith('/api')) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Return 401 for API routes
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Verify token
  const session = await verifyToken(token);

  if (!session) {
    // Clear invalid token
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  // Allow onboarding routes and API
  const isOnboardingRoute = ONBOARDING_ROUTES.some(route => pathname.startsWith(route));
  const isOnboardingAPI = ONBOARDING_API_ROUTES.some(route => pathname.startsWith(route));
  
  if (isOnboardingRoute || isOnboardingAPI) {
    // Add session info to headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-email', session.email);
    if (session.organizationId) {
      requestHeaders.set('x-organization-id', session.organizationId);
    }
    if (session.role) {
      requestHeaders.set('x-user-role', session.role);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Note: Onboarding checks are handled by layout components
  // Middleware runs in Edge Runtime and cannot use Prisma directly
  // The dashboard layout will check onboarding status and redirect if needed

  // Check organization access for routes with [orgSlug]
  const orgSlugMatch = pathname.match(/^\/([^\/]+)\//);
  if (orgSlugMatch) {
    const orgSlug = orgSlugMatch[1];
    
    // You would verify the user has access to this organization
    // For now, we'll just pass the request through
    // In a full implementation, check the database
  }

  // Add session info to headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-user-email', session.email);
  if (session.organizationId) {
    requestHeaders.set('x-organization-id', session.organizationId);
  }
  if (session.role) {
    requestHeaders.set('x-user-role', session.role);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
