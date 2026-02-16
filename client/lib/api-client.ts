/**
 * API Client for YourBooks Backend
 * Handles authentication, request/response formatting, and error handling
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Storage keys for auth
 */
const TOKEN_KEY = 'yourbooks_token';
const USER_KEY = 'yourbooks_user';

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get stored auth token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set auth token in both localStorage and cookies
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  
  // Store in localStorage for API calls
  localStorage.setItem(TOKEN_KEY, token);
  
  // Store in cookie for Next.js API routes (SSR)
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

/**
 * Clear auth token from both localStorage and cookies
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  
  // Clear from localStorage
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  
  // Clear all variations of the auth cookie
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `auth-token=; path=/; max-age=0`;
  document.cookie = `token=; path=/; max-age=0`;
  
  console.log('🧹 Cleared all auth tokens and cookies');
}

/**
 * Get stored user data
 */
export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Set stored user data
 */
export function setStoredUser(user: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Base API request function
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const url = `${API_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || data.message || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

/**
 * API Client methods
 */
export const apiClient = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, params?: Record<string, any>) => {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return apiRequest<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  },

  /**
   * POST request
   */
  post: <T>(endpoint: string, data?: any) => {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PUT request
   */
  put: <T>(endpoint: string, data?: any) => {
    return apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, data?: any) => {
    return apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string) => {
    return apiRequest<T>(endpoint, {
      method: 'DELETE',
    });
  },
};

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
