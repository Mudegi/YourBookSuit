/**
 * Customers API Service
 */

import { apiClient } from '../api-client';

export interface Customer {
  id: string;
  organizationId: string;
  customerNumber: string;
  name: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  balance?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  isActive?: boolean;
}

/**
 * Get all customers
 */
export async function getCustomers(organizationId: string, params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ customers: Customer[]; total: number }> {
  const response = await apiClient.get<{ 
    success: boolean; 
    data: { customers: Customer[]; total: number } 
  }>('/customers', { organizationId, ...params });
  return response.data;
}

/**
 * Get customer by ID
 */
export async function getCustomer(id: string, organizationId: string): Promise<Customer> {
  const response = await apiClient.get<{ success: boolean; data: Customer }>(
    `/customers/${id}`, 
    { organizationId }
  );
  return response.data;
}

/**
 * Create customer
 */
export async function createCustomer(organizationId: string, data: CreateCustomerData): Promise<Customer> {
  const response = await apiClient.post<{ success: boolean; data: Customer }>(
    '/customers', 
    { organizationId, ...data }
  );
  return response.data;
}

/**
 * Update customer
 */
export async function updateCustomer(
  id: string, 
  organizationId: string, 
  data: Partial<CreateCustomerData>
): Promise<Customer> {
  const response = await apiClient.put<{ success: boolean; data: Customer }>(
    `/customers/${id}`, 
    { organizationId, ...data }
  );
  return response.data;
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: string, organizationId: string): Promise<void> {
  await apiClient.delete(`/customers/${id}?organizationId=${organizationId}`);
}
