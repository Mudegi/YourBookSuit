/**
 * Authentication API Service
 */

import { apiClient, setAuthToken, setStoredUser, clearAuthToken } from '../api-client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      createdAt: string;
    };
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

/**
 * Login user
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  console.log('📡 Calling backend login API...');
  const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
  console.log('📡 Backend response:', response);
  console.log('📡 Response structure:', {
    success: response.success,
    hasData: !!response.data,
    hasToken: !!response.data?.token,
    hasUser: !!response.data?.user
  });
  
  if (response.success && response.data.token) {
    console.log('✅ Storing token:', response.data.token.substring(0, 20) + '...');
    setAuthToken(response.data.token);
    setStoredUser(response.data.user);
    console.log('✅ Token stored in localStorage');
  } else {
    console.error('❌ Token not found in response');
  }
  
  return response;
}

/**
 * Register new user
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);
  
  if (response.success && response.data.token) {
    setAuthToken(response.data.token);
    setStoredUser(response.data.user);
  }
  
  return response;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    clearAuthToken();
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<{ success: boolean; data: { user: User } }>('/auth/me');
  return response.data.user;
}
