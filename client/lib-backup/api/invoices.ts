/**
 * Invoices API Service
 */

import { apiClient } from '../api-client';

export interface InvoiceItem {
  id?: string;
  productId?: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  amount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: 'draft' | 'posted' | 'paid' | 'voided' | 'overdue';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  terms?: string;
  notes?: string;
  items: InvoiceItem[];
  customer?: {
    id: string;
    name: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceData {
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  terms?: string;
  notes?: string;
  items: Omit<InvoiceItem, 'id' | 'amount' | 'taxAmount' | 'totalAmount'>[];
}

/**
 * Get all invoices
 */
export async function getInvoices(organizationId: string, params?: {
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ invoices: Invoice[]; total: number }> {
  const response = await apiClient.get<{ 
    success: boolean; 
    data: { invoices: Invoice[]; total: number } 
  }>('/invoices', { organizationId, ...params });
  return response.data;
}

/**
 * Get invoice by ID
 */
export async function getInvoice(id: string, organizationId: string): Promise<Invoice> {
  const response = await apiClient.get<{ success: boolean; data: Invoice }>(
    `/invoices/${id}`, 
    { organizationId }
  );
  return response.data;
}

/**
 * Create invoice
 */
export async function createInvoice(organizationId: string, data: CreateInvoiceData): Promise<Invoice> {
  const response = await apiClient.post<{ success: boolean; data: Invoice }>(
    '/invoices', 
    { organizationId, ...data }
  );
  return response.data;
}

/**
 * Update invoice
 */
export async function updateInvoice(
  id: string, 
  organizationId: string, 
  data: Partial<CreateInvoiceData>
): Promise<Invoice> {
  const response = await apiClient.put<{ success: boolean; data: Invoice }>(
    `/invoices/${id}`, 
    { organizationId, ...data }
  );
  return response.data;
}

/**
 * Post invoice
 */
export async function postInvoice(id: string, organizationId: string): Promise<Invoice> {
  const response = await apiClient.post<{ success: boolean; data: Invoice }>(
    `/invoices/${id}/post`, 
    { organizationId }
  );
  return response.data;
}

/**
 * Void invoice
 */
export async function voidInvoice(id: string, organizationId: string): Promise<Invoice> {
  const response = await apiClient.post<{ success: boolean; data: Invoice }>(
    `/invoices/${id}/void`, 
    { organizationId }
  );
  return response.data;
}

/**
 * Delete invoice
 */
export async function deleteInvoice(id: string, organizationId: string): Promise<void> {
  await apiClient.delete(`/invoices/${id}?organizationId=${organizationId}`);
}
