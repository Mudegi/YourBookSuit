/**
 * Authenticated fetch wrapper for Next.js API routes
 * Automatically includes Authorization header from localStorage
 */

export interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
}

/**
 * Fetch wrapper that automatically includes auth token
 */
export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  const token = isBrowser ? localStorage.getItem('yourbooks_token') : null;
  
  console.log('🔧 fetchWithAuth called:', { 
    url, 
    isBrowser,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
  });
  
  const headers = new Headers(options.headers);
  
  // Add Authorization header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('🔧 Added Authorization header');
  } else {
    console.log('⚠️ No token found!', isBrowser ? 'Browser but no token in localStorage' : 'Server-side render');
  }
  
  // Merge headers back into options
  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };
  
  return fetch(url, fetchOptions);
}

/**
 * Convenience method for GET requests
 */
export async function get(url: string, options: FetchOptions = {}) {
  return fetchWithAuth(url, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function post(url: string, body?: any, options: FetchOptions = {}) {
  const headers = new Headers(options.headers);
  if (body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetchWithAuth(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });
}

/**
 * Convenience method for PUT requests
 */
export async function put(url: string, body?: any, options: FetchOptions = {}) {
  const headers = new Headers(options.headers);
  if (body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetchWithAuth(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });
}

/**
 * Convenience method for PATCH requests
 */
export async function patch(url: string, body?: any, options: FetchOptions = {}) {
  const headers = new Headers(options.headers);
  if (body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetchWithAuth(url, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function del(url: string, options: FetchOptions = {}) {
  return fetchWithAuth(url, { ...options, method: 'DELETE' });
}
