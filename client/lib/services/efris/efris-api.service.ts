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
  item_code: string;              // Required: Unique product identifier (SKU)
  item_name: string;              // Required: Product/service name
  unit_price: string;             // Required: Unit price as STRING (original working format)
  commodity_code: string;         // Required: EFRIS commodity category ID
  unit_of_measure?: string;       // Optional: Default "102" (Pieces)
  have_excise_tax?: string;       // Optional: "101" = Yes, "102" = No (default)
  excise_duty_code?: string;      // Conditional: Required if have_excise_tax = "101"
  stock_quantity?: string;        // Optional: Stock quantity as STRING
  description?: string;           // Optional: Product description/remarks
}

export interface EfrisProductResponse {
  success: boolean;
  product_code?: string;
  efris_status?: string;
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

/**
 * Stock Increase Request - Internal Format
 * This is transformed to EFRIS format (operationType, goodsStockIn, goodsStockInItem) before sending
 */
export interface EfrisStockIncreaseRequest {
  stock_movement_date: string; // YYYY-MM-DD
  supplier_name?: string; // Required for increase operations
  supplier_tin?: string; // Optional
  stock_in_type?: string; // 101=Import, 102=Local Purchase, 103=Manufacture, 104=Opening Stock
  items: Array<{
    item_code: string;
    quantity: number;
    unit_price: number;
    remarks?: string;
  }>;
  remarks?: string;
}

export interface EfrisStockIncreaseResponse {
  success: boolean;
  message: string;
  error_code?: string;
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

export interface EfrisStockDecreaseItem {
  goodsCode: string;
  measureUnit?: string;
  quantity: number;
  unitPrice: number;
  remarks?: string;
}

export interface EfrisStockDecreaseRequest {
  operationType: string; // Always "102" for decrease
  adjustType: string; // 101-105: expired, damaged, personal use, others, raw materials
  stockInDate?: string; // YYYY-MM-DD
  remarks?: string; // Required if adjustType = "104"
  goodsStockInItem: EfrisStockDecreaseItem[];
}

export interface EfrisStockDecreaseResponse {
  returnStateInfo: {
    returnCode: string;
    returnMessage: string;
  };
  data?: any;
}

export interface EfrisExciseDutyCode {
  exciseDutyCode: string;
  goodService: string;
  effectiveDate: string;
  parentCode?: string;
  rateText: string;
  isLeafNode: string;
  exciseDutyDetailsList?: Array<{
    exciseDutyId: string;
    rate: string;
    type: string;
  }>;
}

export interface EfrisExciseDutyResponse {
  success: boolean;
  status: string;
  message: string;
  data: {
    exciseDutyList: EfrisExciseDutyCode[];
  };
}

export interface EfrisCommodityCategory {
  commodityCategoryCode: string;
  commodityCategoryName: string;
  parentCode: string;
  commodityCategoryLevel: string;
  rate: string;
  isLeafNode: string; // "101" = Yes (leaf), "102" = No (has children)
  serviceMark: string; // "101" = Service, "102" = Goods
  isZeroRate: string; // "101" = Yes, "102" = No
  isExempt: string; // "101" = Yes, "102" = No
  excisable: string; // "101" = Yes, "102" = No
  enableStatusCode: string; // "1" = Enabled, "0" = Disabled
  exclusion: string; // "0" = Zero, "1" = Exempt, "2" = No exclusion, "3" = Both
  vatOutScopeCode: string; // "101" = Yes, "102" = No
  zeroRateStartDate?: string;
  zeroRateEndDate?: string;
  exemptRateStartDate?: string;
  exemptRateEndDate?: string;
}

export interface EfrisCommodityCategoryResponse {
  success: boolean;
  status: string;
  message: string;
  data: {
    page: {
      pageNo: string;
      pageSize: string;
      totalSize: string;
      pageCount: string;
    };
    records: EfrisCommodityCategory[];
  };
}

export interface EfrisConfig {
  apiBaseUrl: string;
  apiKey: string;
  enabled: boolean;
  testMode?: boolean;
  /** Request timeout in milliseconds (default: 30000 = 30s) */
  timeoutMs?: number;
}

export class EfrisApiService {
  private config: EfrisConfig;
  private defaultTimeout: number;

  constructor(config: EfrisConfig) {
    this.config = config;
    this.defaultTimeout = config.timeoutMs || 30000; // 30 seconds default
  }

  /**
   * Create a fetch request with timeout via AbortController
   */
  private fetchWithTimeout(url: string, options: RequestInit, timeoutMs?: number): Promise<Response> {
    const timeout = timeoutMs || this.defaultTimeout;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    return fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  }

  /**
   * Submit an invoice to EFRIS for fiscalization
   */
  async submitInvoice(invoiceData: EfrisInvoiceRequest): Promise<EfrisInvoiceResponse> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      console.log('[EFRIS Service] Submitting invoice to:', `${this.config.apiBaseUrl}/submit-invoice`);
      console.log('[EFRIS Service] Request payload:', JSON.stringify(invoiceData, null, 2));
      
      const response = await this.fetchWithTimeout(`${this.config.apiBaseUrl}/submit-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EFRIS Service] Error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        // Middleware returns errors in 'detail' field
        throw new Error(errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: EfrisInvoiceResponse = await response.json();
      
      // Log the COMPLETE raw response to debug field mapping
      console.log('[EFRIS Service] Raw API Response (complete):', JSON.stringify(result, null, 2));
      console.log('[EFRIS Service] Response structure check:', {
        hasSuccess: 'success' in result,
        hasFdn: 'fdn' in result,
        hasData: 'data' in result,
        hasResult: 'result' in result,
        topLevelKeys: Object.keys(result),
      });
      
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
      console.log('[EFRIS Service] Sending product data to backend API:', JSON.stringify(productData, null, 2));
      
      const response = await this.fetchWithTimeout(`${this.config.apiBaseUrl}/register-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[EFRIS Service] Registration failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        // Middleware returns errors in 'detail' field
        throw new Error(errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: EfrisProductResponse = await response.json();
      console.log('[EFRIS Service] Registration successful:', result);
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
      const response = await this.fetchWithTimeout(`${this.config.apiBaseUrl}/submit-purchase-order`, {
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
   * Submit stock increase to EFRIS (T131 interface)
   * Used for: purchases, transfers in, opening stock
   */
  async stockIncrease(stockIncreaseData: EfrisStockIncreaseRequest): Promise<EfrisStockIncreaseResponse> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      // Transform our format to EFRIS T131 API format
      // Based on official EFRIS documentation: operationType goes INSIDE goodsStockIn
      const efrisPayload = {
        goodsStockIn: {
          operationType: "101", // 101 = Stock Increase, 102 = Stock Decrease
          supplierName: stockIncreaseData.supplier_name || 'Unknown Supplier',
          supplierTin: stockIncreaseData.supplier_tin || '',
          stockInType: stockIncreaseData.stock_in_type || "102", // Default: 102=Local Purchase
          stockInDate: stockIncreaseData.stock_movement_date,
          remarks: stockIncreaseData.remarks || 'Stock increase',
          goodsTypeCode: "101", // 101=Goods, 102=Fuel
        },
        goodsStockInItem: stockIncreaseData.items.map(item => ({
          goodsCode: item.item_code,
          quantity: item.quantity.toString(),
          unitPrice: item.unit_price.toString(),
          remarks: item.remarks || '',
        })),
      };
      
      console.log('[EFRIS Service] Sending stock increase data:', JSON.stringify(efrisPayload, null, 2));
      
      const response = await this.fetchWithTimeout(`${this.config.apiBaseUrl}/stock-increase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(efrisPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[EFRIS Service] Stock increase failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: EfrisStockIncreaseResponse = await response.json();
      console.log('[EFRIS Service] Stock increase successful:', result);
      return result;
    } catch (error) {
      console.error('EFRIS stock increase submission error:', error);
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
      const response = await this.fetchWithTimeout(`${this.config.apiBaseUrl}/submit-credit-note`, {
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
      const response = await this.fetchWithTimeout(`${this.config.apiBaseUrl}/submit-debit-note`, {
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
      const response = await this.fetchWithTimeout(`${this.config.apiBaseUrl}/invoice/${invoiceNumber}`, {
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
      
      const response = await this.fetchWithTimeout(url, {
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

  /**
   * Submit stock decrease to EFRIS
   * Used for: damaged goods, expired items, personal use, raw materials consumption, etc.
   */
  async submitStockDecrease(stockDecreaseData: EfrisStockDecreaseRequest): Promise<EfrisStockDecreaseResponse> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      const response = await this.fetchWithTimeout(`${this.config.apiBaseUrl}/stock-decrease`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(stockDecreaseData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: EfrisStockDecreaseResponse = await response.json();
      return result;
    } catch (error) {
      console.error('EFRIS stock decrease submission error:', error);
      throw error;
    }
  }

  /**
   * Fetch excise duty codes from EFRIS
   */
  async getExciseCodes(params?: { excise_code?: string; excise_name?: string }): Promise<EfrisExciseDutyResponse> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      const queryParams = new URLSearchParams();
      queryParams.set('token', 'test_token'); // Required by EFRIS API
      // Note: Not passing test_mode as query param - it triggers backend bug
      // Test mode is handled by the backend based on company configuration
      if (params?.excise_code) queryParams.set('excise_code', params.excise_code);
      if (params?.excise_name) queryParams.set('excise_name', params.excise_name);

      const url = `${this.config.apiBaseUrl}/excise-duty?${queryParams.toString()}`;
      
      console.log('[EFRIS] Making request to:', url);
      console.log('[EFRIS] Query params:', { excise_code: params?.excise_code, excise_name: params?.excise_name });
      
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });

      console.log('[EFRIS] Response status:', response.status);
      console.log('[EFRIS] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EFRIS] Error response body:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: EfrisExciseDutyResponse = await response.json();
      return result;
    } catch (error) {
      console.error('EFRIS excise codes query error:', error);
      throw error;
    }
  }

  /**
   * Get commodity categories (VAT categories) from EFRIS T124
   */
  async getCommodityCategories(params?: { 
    pageNo?: number; 
    pageSize?: number;
  }): Promise<EfrisCommodityCategoryResponse> {
    if (!this.config.enabled) {
      throw new Error('EFRIS integration is not enabled');
    }

    try {
      const queryParams = new URLSearchParams();
      queryParams.set('token', 'test_token'); // Required by EFRIS API
      queryParams.set('pageNo', (params?.pageNo || 1).toString());
      queryParams.set('pageSize', (params?.pageSize || 100).toString()); // Fetch more items per page

      const url = `${this.config.apiBaseUrl}/commodity-categories?${queryParams.toString()}`;
      
      console.log('[EFRIS] Making request to:', url);
      console.log('[EFRIS] Query params:', { pageNo: params?.pageNo, pageSize: params?.pageSize });
      
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });

      console.log('[EFRIS] Response status:', response.status);
      console.log('[EFRIS] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EFRIS] Error response body:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: EfrisCommodityCategoryResponse = await response.json();
      return result;
    } catch (error) {
      console.error('EFRIS commodity categories query error:', error);
      throw error;
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
  testMode?: boolean;
}): EfrisApiService | null {
  if (!efrisSettings.apiBaseUrl || !efrisSettings.apiKey || !efrisSettings.enabled) {
    return null;
  }

  return new EfrisApiService({
    apiBaseUrl: efrisSettings.apiBaseUrl,
    apiKey: efrisSettings.apiKey,
    enabled: efrisSettings.enabled,
    testMode: efrisSettings.testMode,
  });
}
