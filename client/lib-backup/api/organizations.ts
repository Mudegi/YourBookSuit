/**
 * Organizations API Service
 */

import { apiClient } from '../api-client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  businessName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  baseCurrency?: string;
  fiscalYearEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationData {
  name: string;
  slug: string;
  businessName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  baseCurrency?: string;
  fiscalYearEnd?: string;
}

/**
 * Get all organizations for current user
 */
export async function getOrganizations(): Promise<Organization[]> {
  const response = await apiClient.get<{ success: boolean; data: Organization[] }>('/organizations');
  return response.data;
}

/**
 * Get organization by ID
 */
export async function getOrganization(id: string): Promise<Organization> {
  const response = await apiClient.get<{ success: boolean; data: Organization }>(`/organizations/${id}`);
  return response.data;
}

/**
 * Create new organization
 */
export async function createOrganization(data: CreateOrganizationData): Promise<Organization> {
  const response = await apiClient.post<{ success: boolean; data: Organization }>('/organizations', data);
  return response.data;
}

/**
 * Update organization
 */
export async function updateOrganization(id: string, data: Partial<CreateOrganizationData>): Promise<Organization> {
  const response = await apiClient.put<{ success: boolean; data: Organization }>(`/organizations/${id}`, data);
  return response.data;
}
