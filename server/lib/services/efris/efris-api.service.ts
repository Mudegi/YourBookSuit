/**
 * EFRIS API Service
 * 
 * This service handles communication with the EFRIS backend API
 * for fiscalization of invoices, product registration, purchase orders, and credit notes.
 * 
 * Based on the DEVELOPER_PACKAGE implementation guide.
 */

export interface EfrisInvoiceItem {
  item: string;                     // Product display name
  itemCode: string;                 // EFRIS registered item code
  qty: string;                      // Quantity as string
  unitOfMeasure: string;            // Unit code (101, 102, etc.)
  unitPrice: string;                // Unit price as string
  total: string;                    // Line total as string
  taxRate: string;                  // Tax rate as string (e.g., "0.18")
  tax: string;                      // Tax amount as string
  orderNumber: string;              // Sequential order number starting from "1"
  discountFlag: string;             // "1"=has discount, "2"=no discount
  deemedFlag: string;               // "2"=not deemed (standard)
  exciseFlag: string;               // "1"=has excise, "2"=no excise
  goodsCategoryId: string;          // Commodity code (SKU)
  goodsCategoryName?: string;       // Category display name
  vatApplicableFlag: string;        // "1"=VAT applies, "0"=no VAT
  discountTotal?: string;           // Discount amount (if discountFlag="1")
  discountTaxRate?: string;         // Discount tax rate (if discountFlag="1")
  // Excise fields (if exciseFlag="1")
  categoryId?: string;              // Excise duty code
  categoryName?: string;            // "Excise Duty"
  exciseRate?: string;              // Excise rate as string
  exciseRule?: string;              // "1"=percentage, "2"=quantity
  exciseTax?: string;               // Excise tax amount as string
  exciseUnit?: string;              // Excise unit code
  exciseCurrency?: string;          // "UGX"
  exciseRateName?: string;          // Display name for excise rate
  pack?: string;                    // Package value (if exciseRule="2")
  stick?: string;                   // Piece value (if exciseRule="2")
}

export interface EfrisTaxDetail {
  taxCategoryCode: string;          // "01"=VAT, "05"=Excise
  netAmount: string;                // Net amount for this tax category
  taxRate: string;                  // Tax rate as string ("0.18" for VAT, "0" for fixed excise)
  taxAmount: string;                // Tax amount for this category
  grossAmount: string;              // Gross amount for this category
  taxRateName?: string;             // Display name for the tax
  exciseUnit?: string;              // Excise unit (for excise categories)
  exciseCurrency?: string;          // Excise currency (for excise categories)
}

export interface EfrisInvoiceRequest {
  invoice_number: string;
  invoice_date: string; // YYYY-MM-DD
  customer_name: string;
  customer_tin?: string;
  customer_address?: string;
  customer_email?: string;
  customer_phone?: string;
  buyer_type: string;               // "0"=Business, "1"=Individual, "2"=Government
  payment_method: string;           // Payment mode code (101=Cash, 102=Credit, etc.)
  currency: string;                 // "UGX"
  items: EfrisInvoiceItem[];
  tax_details: EfrisTaxDetail[];    // Tax breakdown by category
  total_amount: number;
  total_tax: number;
  notes?: string;
}

export interface EfrisInvoiceResponse {
  success: boolean;
  fdn?: string;
  verification_code?: string;
  qr_code?: string;
  invoice_number?: string;
  fiscalized_at?: string;
  error_code?: string;
  message?: string;
}

export interface EfrisProductRequest {
  product_name: string;
  product_code: string;
  category?: string;
  unit_of_measure?: string;
  unit_price?: number;
  description?: string;
}

export interface EfrisProductResponse {
  success: boolean;
  product_code?: string;
  registration_date?: string;
  error_code?: string;
  message?: string;
}

export interface EfrisPurchaseOrderRequest {
  po_number: string;
  po_date: string;
  vendor_name: string;
  vendor_tin?: string;
  items: Array<{
    item_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  total_amount: number;
  currency: string;
}

export interface EfrisPurchaseOrderResponse {
  success: boolean;
  reference_number?: string;
  submission_date?: string;
  error_code?: string;
  message?: string;
}

export interface EfrisCreditNoteRequest {
  credit_note_number: string;
  credit_note_date: string;
  original_invoice_number: string;
  original_fdn: string;
  customer_name: string;
  customer_tin?: string;
  items: EfrisInvoiceItem[];
  total_amount: number;
  total_tax: number;
  currency: string;
  reason?: string;
}

export interface EfrisCreditNoteResponse {
  success: boolean;
  fdn?: string;
  verification_code?: string;
  qr_code?: string;
  credit_note_number?: string;
  fiscalized_at?: string;
  error_code?: string;
  message?: string;
}

export interface EfrisDebitNoteRequest {
  debit_note_number: string;
  debit_note_date: string;
  original_invoice_number?: string;
  original_fdn?: string;
  customer_name: string;
  customer_tin?: string;
  items: EfrisInvoiceItem[];
  total_amount: number;
  total_tax: number;
  currency: string;
  reason?: string;
}

export interface EfrisDebitNoteResponse {
  success: boolean;
  fdn?: string;
  verification_code?: string;
  qr_code?: string;
  debit_note_number?: string;
  fiscalized_at?: string;
  error_code?: string;
  message?: string;
}

export interface EfrisConfig {
  apiBaseUrl: string;
  apiKey: string;
  enabled: boolean;
}

export class EfrisApiService {
  private config: EfrisConfig;

  constructor(config: EfrisConfig) {
    this.config = config;
  }

  /**
   * Submit an invoice to EFRIS for fiscalization
   */
  async submitInvoice(invoiceData: EfrisInvoiceRequest): Promise<EfrisInvoiceResponse> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/submit-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: EfrisInvoiceResponse = await response.json();
      return result;
    } catch (error) {
      console.error('EFRIS invoice submission error:', error);
      throw error;
    }
  }

  /**
   * Register a product with EFRIS
   */
  async registerProduct(productData: EfrisProductRequest): Promise<EfrisProductResponse> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/register-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: EfrisProductResponse = await response.json();
      return result;
    } catch (error) {
      console.error('EFRIS product registration error:', error);
      throw error;
    }
  }

  /**
   * Submit a purchase order to EFRIS
   */
  async submitPurchaseOrder(poData: EfrisPurchaseOrderRequest): Promise<EfrisPurchaseOrderResponse> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/submit-purchase-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(poData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: EfrisPurchaseOrderResponse = await response.json();
      return result;
    } catch (error) {
      console.error('EFRIS purchase order submission error:', error);
      throw error;
    }
  }

  /**
   * Submit a credit note to EFRIS
   */
  async submitCreditNote(creditNoteData: EfrisCreditNoteRequest): Promise<EfrisCreditNoteResponse> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/submit-credit-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(creditNoteData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: EfrisCreditNoteResponse = await response.json();
      return result;
    } catch (error) {
      console.error('EFRIS credit note submission error:', error);
      throw error;
    }
  }

  /**
   * Submit a debit note to EFRIS
   */
  async submitDebitNote(debitNoteData: EfrisDebitNoteRequest): Promise<EfrisDebitNoteResponse> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/submit-debit-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(debitNoteData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: EfrisDebitNoteResponse = await response.json();
      return result;
    } catch (error) {
      console.error('EFRIS debit note submission error:', error);
      throw error;
    }
  }

  /**
   * Query invoice status from EFRIS
   */
  async getInvoiceStatus(invoiceNumber: string): Promise<any> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/invoice/${invoiceNumber}`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('EFRIS invoice status query error:', error);
      throw error;
    }
  }

  /**
   * Get list of invoices from EFRIS
   */
  async getInvoices(params?: { page?: number; limit?: number; status?: string }): Promise<any> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.status) queryParams.set('status', params.status);

      const url = `${this.config.apiBaseUrl}/invoices?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('EFRIS invoices query error:', error);
      throw error;
    }
  }

  /**
   * Test the EFRIS API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try to fetch invoices as a simple connection test
      await this.getInvoices({ limit: 1 });
      return { success: true, message: 'Successfully connected to EFRIS API' };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || 'Failed to connect to EFRIS API' 
      };
    }
  }
}

/**
 * Factory function to create an EFRIS service instance from organization settings
 */
export function createEfrisService(efrisSettings: {
  apiBaseUrl?: string | null;
  apiKey?: string | null;
  enabled?: boolean;
}): EfrisApiService | null {
  if (!efrisSettings.apiBaseUrl || !efrisSettings.apiKey || !efrisSettings.enabled) {
    return null;
  }

  return new EfrisApiService({
    apiBaseUrl: efrisSettings.apiBaseUrl,
    apiKey: efrisSettings.apiKey,
    enabled: efrisSettings.enabled,
  });
}
