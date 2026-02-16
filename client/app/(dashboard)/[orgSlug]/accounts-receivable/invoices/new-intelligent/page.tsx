'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Plus, Trash2, Save, AlertCircle, CheckCircle, 
  Upload, X, Package, DollarSign, CreditCard, TrendingUp 
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';
import { EfrisFiscalInvoice } from '@/components/invoices/EfrisFiscalInvoice';

interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string | null;
  email?: string | null;
  currency?: string;
  paymentTerms?: number;
  creditLimit?: number;
  currentBalance?: number;
  isOnCreditHold?: boolean;
  isTaxExempt?: boolean;
  priceListId?: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantityOnHand?: number;
  description?: string;
  exciseDutyCode?: string | null;
  goodsCategoryId?: string | null;
}

interface Service {
  id: string;
  name: string;
  code: string;
  rate: number;
  description?: string;
}

interface TaxRate {
  id: string;
  name: string;
  displayName?: string;
  rate: number;
  calculationType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  fixedAmount?: number;
  isInclusiveDefault: boolean;
  isActive: boolean;
}

interface InvoiceLineItem {
  id: string;
  type: 'product' | 'service';
  productId?: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice?: number;
  displayRate: number;
  listPrice?: number;
  discount: number;
  discountType: 'AMOUNT' | 'PERCENTAGE';
  taxRateId?: string;
  availableStock?: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  // EFRIS excise duty fields
  exciseDutyCode?: string | null;
  goodsCategoryId?: string | null;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  inventoryIssues?: any[];
  creditCheckResult?: {
    passed: boolean;
    creditLimit: number;
    currentBalance: number;
    invoiceAmount: number;
    availableCredit: number;
    reason?: string;
  };
}

export default function IntelligentInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { organization, currency: baseCurrency } = useOrganization();

  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  
  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [taxCalculationMethod, setTaxCalculationMethod] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // EFRIS fields
  const [buyerType, setBuyerType] = useState<string>('1'); // Default to B2C
  const [paymentMethod, setPaymentMethod] = useState<string>('102'); // Default to Cash
  const [customerTin, setCustomerTin] = useState<string>(''); // For capturing TIN if needed

  // UI state
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [fiscalizeWithEfris, setFiscalizeWithEfris] = useState(false);
  const [efrisEnabled, setEfrisEnabled] = useState(false);
  
  // Modal states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showRecurringSetup, setShowRecurringSetup] = useState(false);
  const [showCustomisation, setShowCustomisation] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [showEfrisFiscalInvoice, setShowEfrisFiscalInvoice] = useState(false);
  const [efrisFiscalData, setEfrisFiscalData] = useState<any>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  
  // Quick add customer form
  const [quickCustomerForm, setQuickCustomerForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    currency: baseCurrency,
    paymentTerms: 30,
  });
  
  // Customisation settings
  const [customisation, setCustomisation] = useState({
    companyLogo: '',
    primaryColor: '#3b82f6',
    showLogo: true,
    showNotes: true,
    showTerms: true,
    template: 'classic' as 'classic' | 'modern' | 'minimal'
  });
  
  // Recurring invoice settings
  const [recurringConfig, setRecurringConfig] = useState({
    frequency: 'MONTHLY' as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    maxOccurrences: '',
    autoSend: false
  });

  // Calculated totals
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const total = subtotal - totalDiscount + totalTax;

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchServices();
    fetchTaxRates();
    checkEfrisConfig();
  }, [orgSlug]);

  const checkEfrisConfig = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/settings/efris`);
      if (res.ok) {
        const data = await res.json();
        setEfrisEnabled(data.config?.isActive === true);
      }
    } catch (err) {
      console.error('Error checking EFRIS config:', err);
    }
  };

  useEffect(() => {
    // Auto-calculate due date when customer or invoice date changes
    if (selectedCustomer && invoiceDate) {
      const paymentTerms = selectedCustomer.paymentTerms || 30;
      const date = new Date(invoiceDate);
      date.setDate(date.getDate() + paymentTerms);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [selectedCustomer, invoiceDate]);

  useEffect(() => {
    // Update currency when baseCurrency loads
    if (baseCurrency && !selectedCustomer) {
      setCurrency(baseCurrency);
    }
  }, [baseCurrency]);

  useEffect(() => {
    // Set currency from customer if available
    if (selectedCustomer?.currency) {
      setCurrency(selectedCustomer.currency);
    } else if (baseCurrency) {
      // Reset to base currency if customer is cleared
      setCurrency(baseCurrency);
    }
  }, [selectedCustomer, baseCurrency]);

  useEffect(() => {
    // Update quick customer form currency when organization currency loads
    if (baseCurrency) {
      setQuickCustomerForm(prev => ({
        ...prev,
        currency: baseCurrency
      }));
    }
  }, [baseCurrency]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/customers?limit=1000`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/inventory/products`);
      if (res.ok) {
        const data = await res.json();
        // Handle both response formats: { success: true, data: [...] } or { products: [...] }
        const productsList = data.data || data.products || [];
        const formatted = productsList.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          unitPrice: p.sellingPrice || p.unitPrice || 0,
          quantityOnHand: p.quantityOnHand || p.quantityAvailable || 0,
          description: p.description || '',
          exciseDutyCode: p.exciseDutyCode || null,
          goodsCategoryId: p.goodsCategoryId || null,
        }));
        console.log('Products loaded:', formatted.length, formatted);
        setProducts(formatted);
      } else {
        console.error('Failed to fetch products:', res.status);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/services?limit=1000`);
      if (res.ok) {
        const data = await res.json();
        const servicesList = data.services || data.data || [];
        const formatted = servicesList.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          rate: s.rate || s.price || 0,
          description: s.description || ''
        }));
        console.log('Services loaded:', formatted.length, formatted);
        setServices(formatted);
      } else {
        console.error('Failed to fetch services:', res.status);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchTaxRates = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/tax/rates?activeOnly=true`);
      if (res.ok) {
        const data = await res.json();
        setTaxRates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching tax rates:', error);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerSearch(false);
    setCustomerSearch('');
  };

  const handleQuickAddCustomer = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orgs/${orgSlug}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickCustomerForm),
      });

      if (res.ok) {
        const result = await res.json();
        const newCustomer = result.customer || result.data;
        
        // Add to customers list and select it
        setCustomers([...customers, newCustomer]);
        setSelectedCustomer(newCustomer);
        
        // Reset form and close modal
        setQuickCustomerForm({
          firstName: '',
          lastName: '',
          companyName: '',
          email: '',
          phone: '',
          currency: baseCurrency,
          paymentTerms: 30,
        });
        setShowQuickAddCustomer(false);
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = (type: 'product' | 'service' = 'product') => {
    const newItem: InvoiceLineItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      description: '',
      quantity: 1,
      unitPrice: 0,
      displayRate: 0,
      discount: 0,
      discountType: 'AMOUNT',
      taxRateId: undefined,
      subtotal: 0,
      taxAmount: 0,
      total: 0,
    };
    setItems([...items, newItem]);
  };

  const removeLineItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, updates: Partial<InvoiceLineItem>) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, ...updates };
      
      // If displayRate was updated, recalculate unitPrice based on tax method
      if (updates.displayRate !== undefined) {
        const selectedTaxRate = updated.taxRateId 
          ? taxRates.find(tr => tr.id === updated.taxRateId)
          : null;
        
        if (selectedTaxRate && taxCalculationMethod === 'INCLUSIVE') {
          // Inclusive: displayRate includes tax, extract base unitPrice
          if (selectedTaxRate.calculationType === 'PERCENTAGE') {
            const taxRate = selectedTaxRate.rate / 100;
            updated.unitPrice = updated.displayRate / (1 + taxRate);
          } else if (selectedTaxRate.calculationType === 'FIXED_AMOUNT') {
            const fixedTaxAmount = selectedTaxRate.fixedAmount || 0;
            updated.unitPrice = updated.displayRate - (fixedTaxAmount / updated.quantity);
          }
        } else {
          // Exclusive or no tax: displayRate = unitPrice
          updated.unitPrice = updated.displayRate;
        }
      } else if (updates.unitPrice !== undefined && updates.displayRate === undefined) {
        // If unitPrice was updated directly (not via displayRate), sync displayRate
        updated.displayRate = updated.unitPrice || 0;
      }
      
      // IMPORTANT: Recalculate displayRate when tax rate changes or when we need to apply tax method
      // This ensures displayRate is always correct for the current tax calculation method
      const shouldRecalculateDisplay = updates.taxRateId !== undefined || 
                                        updates.unitPrice !== undefined ||
                                        (!updated.displayRate && updated.unitPrice);
      
      if (shouldRecalculateDisplay) {
        const selectedTaxRate = updated.taxRateId 
          ? taxRates.find(tr => tr.id === updated.taxRateId)
          : null;
        
        if (selectedTaxRate && taxCalculationMethod === 'INCLUSIVE' && updated.unitPrice) {
          // Calculate tax-inclusive displayRate
          if (selectedTaxRate.calculationType === 'PERCENTAGE') {
            const taxRate = selectedTaxRate.rate / 100;
            updated.displayRate = updated.unitPrice * (1 + taxRate);
          } else if (selectedTaxRate.calculationType === 'FIXED_AMOUNT') {
            const fixedTaxAmount = selectedTaxRate.fixedAmount || 0;
            updated.displayRate = updated.unitPrice + (fixedTaxAmount / updated.quantity);
          }
        } else if (!selectedTaxRate || taxCalculationMethod === 'EXCLUSIVE') {
          // For exclusive or no tax, displayRate = unitPrice
          updated.displayRate = updated.unitPrice || 0;
        }
      }
      
      // Import tax calculation logic
      const { calculateLineItem } = require('@/lib/tax/tax-calculation');
      
      // Find the selected tax rate
      const selectedTaxRate = updated.taxRateId 
        ? taxRates.find(tr => tr.id === updated.taxRateId)
        : null;
      
      // Use global tax calculation method (inclusive/exclusive) for all items
      const isInclusive = taxCalculationMethod === 'INCLUSIVE';
      
      // Calculate tax based on selected rate
      let taxRate = 0;
      let fixedTaxAmount = 0;
      
      if (selectedTaxRate) {
        if (selectedTaxRate.calculationType === 'PERCENTAGE') {
          taxRate = selectedTaxRate.rate / 100;
        } else if (selectedTaxRate.calculationType === 'FIXED_AMOUNT') {
          fixedTaxAmount = selectedTaxRate.fixedAmount || 0;
        }
      }
      
      // Calculate discount amount based on discount type
      let discountAmount = 0;
      const lineSubtotal = updated.quantity * (updated.unitPrice || 0);
      
      if (updated.discountType === 'PERCENTAGE') {
        // Calculate discount as percentage of subtotal
        discountAmount = lineSubtotal * (updated.discount / 100);
      } else {
        // Discount is already an amount
        discountAmount = updated.discount || 0;
      }
      
      // Calculate line totals
      let lineCalc;
      if (selectedTaxRate?.calculationType === 'FIXED_AMOUNT') {
        // Fixed amount tax
        const subtotal = lineSubtotal;
        const netAmount = subtotal - discountAmount;
        lineCalc = {
          lineSubtotal: subtotal,
          lineDiscount: discountAmount,
          lineNet: netAmount,
          lineTax: fixedTaxAmount,
          lineTotal: netAmount + fixedTaxAmount,
        };
      } else {
        // Percentage tax
        // Note: unitPrice is already the net amount (tax extracted if inclusive mode),
        // so we always pass isInclusive=false to calculateLineItem
        lineCalc = calculateLineItem(
          updated.quantity,
          updated.unitPrice || 0,
          taxRate,
          false, // Always false because unitPrice is already net
          discountAmount
        );
      }

      return {
        ...updated,
        subtotal: lineCalc.lineSubtotal,
        discount: lineCalc.lineDiscount,
        taxAmount: selectedTaxRate ? lineCalc.lineTax : 0,
        total: selectedTaxRate ? lineCalc.lineTotal : lineCalc.lineNet,
      };
    }));
  };

  const handleTaxMethodToggle = () => {
    const newMethod = taxCalculationMethod === 'INCLUSIVE' ? 'EXCLUSIVE' : 'INCLUSIVE';
    setTaxCalculationMethod(newMethod);
    
    // Recalculate all line items with the new tax method
    setItems(items.map(item => {
      if (!item.taxRateId) return item;
      
      // Import tax calculation logic
      const { calculateLineItem } = require('@/lib/tax/tax-calculation');
      
      // Find the selected tax rate
      const selectedTaxRate = taxRates.find(tr => tr.id === item.taxRateId);
      if (!selectedTaxRate) return item;
      
      const isInclusive = newMethod === 'INCLUSIVE';
      
      // Calculate tax based on selected rate
      let taxRate = 0;
      let fixedTaxAmount = 0;
      
      if (selectedTaxRate.calculationType === 'PERCENTAGE') {
        taxRate = selectedTaxRate.rate / 100;
      } else if (selectedTaxRate.calculationType === 'FIXED_AMOUNT') {
        fixedTaxAmount = selectedTaxRate.fixedAmount || 0;
      }
      
      // Calculate discount amount based on discount type
      let discountAmount = 0;
      const lineSubtotal = item.quantity * (item.unitPrice || 0);
      
      if (item.discountType === 'PERCENTAGE') {
        discountAmount = lineSubtotal * (item.discount / 100);
      } else {
        discountAmount = item.discount || 0;
      }
      
      // Calculate line totals
      let lineCalc;
      if (selectedTaxRate.calculationType === 'FIXED_AMOUNT') {
        // Fixed amount tax
        const subtotal = lineSubtotal;
        const netAmount = subtotal - discountAmount;
        lineCalc = {
          lineSubtotal: subtotal,
          lineDiscount: discountAmount,
          lineNet: netAmount,
          lineTax: fixedTaxAmount,
          lineTotal: netAmount + fixedTaxAmount,
        };
      } else {
        // Percentage tax
        // unitPrice is always the net amount, so always use false for isInclusive
        lineCalc = calculateLineItem(
          item.quantity,
          item.unitPrice,
          taxRate,
          false, // Always false because unitPrice is net
          discountAmount
        );
      }
      
      // Calculate display rate (tax-inclusive or tax-exclusive)
      let displayRate = item.unitPrice || 0;
      if (displayRate > 0) {
        if (newMethod === 'INCLUSIVE') {
          // Inclusive: displayRate should include tax
          if (selectedTaxRate.calculationType === 'PERCENTAGE') {
            displayRate = displayRate * (1 + taxRate);
          } else if (selectedTaxRate.calculationType === 'FIXED_AMOUNT') {
            // For fixed amount, add per-unit tax
            displayRate = displayRate + (fixedTaxAmount / item.quantity);
          }
        }
        // Exclusive: displayRate stays as unitPrice (no change needed)
      }

      return {
        ...item,
        displayRate: displayRate || 0,
        subtotal: lineCalc.lineSubtotal,
        taxAmount: lineCalc.lineTax,
        total: lineCalc.lineTotal,
      };
    }));
  };

  const selectProduct = async (itemId: string, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Use the stock data from the product that was already fetched
    const availableStock = product.quantityOnHand || 0;

    // Fetch price from price list if customer has one
    let unitPrice = product.unitPrice;
    if (selectedCustomer?.priceListId) {
      try {
        const res = await fetch(
          `/api/orgs/${orgSlug}/price-lists/${selectedCustomer.priceListId}/items/${productId}`
        );
        if (res.ok) {
          const data = await res.json();
          unitPrice = data.price || product.unitPrice;
        }
      } catch (error) {
        console.error('Error fetching price list price:', error);
      }
    }

    // Calculate displayRate based on current tax method
    const currentItem = items.find(i => i.id === itemId);
    let displayRate = unitPrice;
    
    if (currentItem?.taxRateId && taxCalculationMethod === 'INCLUSIVE') {
      const selectedTaxRate = taxRates.find(tr => tr.id === currentItem.taxRateId);
      if (selectedTaxRate && selectedTaxRate.calculationType === 'PERCENTAGE') {
        const taxRate = selectedTaxRate.rate / 100;
        displayRate = unitPrice * (1 + taxRate);
      }
    }

    updateLineItem(itemId, {
      productId,
      description: product.name,
      unitPrice,
      displayRate,
      listPrice: product.unitPrice,
      availableStock,
      exciseDutyCode: product.exciseDutyCode,
      goodsCategoryId: product.goodsCategoryId,
    });

    setShowProductSearch(null);
    setProductSearch('');
  };

  const selectService = (itemId: string, serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    // Calculate displayRate based on current tax method
    const currentItem = items.find(i => i.id === itemId);
    let displayRate = service.rate;
    
    if (currentItem?.taxRateId && taxCalculationMethod === 'INCLUSIVE') {
      const selectedTaxRate = taxRates.find(tr => tr.id === currentItem.taxRateId);
      if (selectedTaxRate && selectedTaxRate.calculationType === 'PERCENTAGE') {
        const taxRate = selectedTaxRate.rate / 100;
        displayRate = service.rate * (1 + taxRate);
      }
    }

    updateLineItem(itemId, {
      serviceId,
      description: service.name,
      unitPrice: service.rate,
      displayRate,
    });

    setShowProductSearch(null);
    setProductSearch('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments([...attachments, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const validateInvoice = async () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validations
    if (!selectedCustomer) {
      errors.push('Please select a customer');
    }

    if (items.length === 0) {
      errors.push('Please add at least one line item');
    }

    if (!invoiceDate) {
      errors.push('Invoice date is required');
    }

    if (!dueDate) {
      errors.push('Due date is required');
    }

    // Date validations
    if (invoiceDate && dueDate) {
      const invDate = new Date(invoiceDate);
      const dueDateObj = new Date(dueDate);
      
      if (dueDateObj < invDate) {
        errors.push('Due date cannot be before invoice date');
      }
    }

    // Line item validations
    items.forEach((item, index) => {
      const lineNum = index + 1;
      
      // Description check
      if (!item.description || item.description.trim() === '') {
        warnings.push(`Line ${lineNum}: Missing product/service description`);
      }
      
      // Quantity check
      if (item.quantity <= 0) {
        errors.push(`Line ${lineNum}: Quantity must be greater than zero`);
      }
      
      // Price check
      if ((item.displayRate || 0) <= 0) {
        warnings.push(`Line ${lineNum}: Price is zero or negative`);
      }
      
      // Stock check (warning only, not blocking)
      if (item.availableStock !== undefined && item.quantity > item.availableStock) {
        warnings.push(`Line ${lineNum}: Quantity (${item.quantity}) exceeds available stock (${item.availableStock})`);
      }
      
      // Discount check
      if (item.discountType === 'PERCENTAGE') {
        if (item.discount > 100) {
          errors.push(`Line ${lineNum}: Percentage discount cannot exceed 100%`);
        }
      } else {
        const lineSubtotal = (item.displayRate || 0) * item.quantity;
        if (item.discount > lineSubtotal) {
          errors.push(`Line ${lineNum}: Discount cannot exceed line amount`);
        }
      }
    });

    // If there are errors, show them and return
    if (errors.length > 0 || warnings.length > 0) {
      setValidation({
        valid: errors.length === 0,
        errors,
        warnings,
      });
      setValidating(false);
      return;
    }

    setValidating(true);

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/invoices/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer!.id,
          invoiceDate,
          dueDate,
          currency,
          items: items.map(item => ({
            productId: item.productId,
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            discountType: item.discountType,
            taxRateId: item.taxRateId,
          })),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setValidation(result);
      } else {
        setValidation({
          valid: false,
          errors: ['Validation failed'],
          warnings: [],
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidation({
        valid: false,
        errors: ['Validation request failed'],
        warnings: [],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (shouldFiscalizeWithEfris = false, shouldSendEmail = false) => {
    // Run comprehensive validation
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validations
    if (!selectedCustomer) {
      errors.push('Please select a customer');
    }

    if (items.length === 0) {
      errors.push('Please add at least one line item');
    }

    if (!invoiceDate) {
      errors.push('Invoice date is required');
    }

    if (!dueDate) {
      errors.push('Due date is required');
    }

    // Date validations
    if (invoiceDate && dueDate) {
      const invDate = new Date(invoiceDate);
      const dueDateObj = new Date(dueDate);
      
      if (dueDateObj < invDate) {
        errors.push('Due date cannot be before invoice date');
      }
    }

    // Line item validations
    items.forEach((item, index) => {
      const lineNum = index + 1;
      
      // Description check
      if (!item.description || item.description.trim() === '') {
        warnings.push(`Line ${lineNum}: Missing product/service description`);
      }
      
      // Quantity check
      if (item.quantity <= 0) {
        errors.push(`Line ${lineNum}: Quantity must be greater than zero`);
      }
      
      // Price check
      if ((item.displayRate || 0) <= 0) {
        warnings.push(`Line ${lineNum}: Price is zero or negative`);
      }
      
      // Stock check (warning only, not blocking)
      if (item.availableStock !== undefined && item.quantity > item.availableStock) {
        warnings.push(`Line ${lineNum}: Quantity (${item.quantity}) exceeds available stock (${item.availableStock})`);
      }
      
      // Discount check
      if (item.discountType === 'PERCENTAGE') {
        if (item.discount > 100) {
          errors.push(`Line ${lineNum}: Percentage discount cannot exceed 100%`);
        }
      } else {
        const lineSubtotal = (item.displayRate || 0) * item.quantity;
        if (item.discount > lineSubtotal) {
          errors.push(`Line ${lineNum}: Discount cannot exceed line amount`);
        }
      }
    });

    // If there are errors, show them and stop submission
    if (errors.length > 0) {
      setValidation({
        valid: false,
        errors,
        warnings,
      });
      // Scroll to top to show validation errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // If there are warnings, show them but allow submission to continue
    if (warnings.length > 0) {
      setValidation({
        valid: true,
        errors: [],
        warnings,
      });
    }

    setLoading(true);

    try {
      // Upload attachments first
      const attachmentUrls: string[] = [];
      for (const file of attachments) {
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadRes = await fetch(`/api/orgs/${orgSlug}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          attachmentUrls.push(url);
        }
      }

      // Create invoice
      const res = await fetch(`/api/orgs/${orgSlug}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          invoiceDate,
          dueDate,
          currency,
          taxCalculationMethod,
          reference,
          notes,
          attachments: attachmentUrls,
          // EFRIS fields
          buyerType: efrisEnabled ? buyerType : undefined,
          paymentMethod: efrisEnabled ? paymentMethod : undefined,
          customerTin: efrisEnabled ? (customerTin || selectedCustomer?.taxIdNumber) : undefined,
          items: items.map(item => ({
            productId: item.productId,
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            // When INCLUSIVE, send displayRate (user-entered tax-inclusive price)
            // When EXCLUSIVE, send unitPrice (tax-exclusive price)
            // Backend will extract tax from displayRate when taxCalculationMethod is INCLUSIVE
            unitPrice: taxCalculationMethod === 'INCLUSIVE' ? item.displayRate : item.unitPrice,
            discount: item.discount,
            discountType: item.discountType,
            taxRateId: item.taxRateId,
          })),
          autoCommitInventory: true,
          autoSubmitToTaxAuthority: false, // Manual for now
        }),
      });

      if (res.ok) {
        const invoice = await res.json();
        const invoiceId = invoice.id;

        // Fiscalize with EFRIS if requested
        if (shouldFiscalizeWithEfris) {
          try {
            const efrisRes = await fetch(`/api/orgs/${orgSlug}/invoices/${invoiceId}/efris`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (!efrisRes.ok) {
              const efrisError = await efrisRes.json();
              alert(`Invoice created but EFRIS fiscalization failed: ${efrisError.error}`);
              // Still navigate to invoice detail
              router.push(`/${orgSlug}/accounts-receivable/invoices/${invoiceId}`);
              return;
            }
            
            // Get the fiscal invoice data from response
            const efrisData = await efrisRes.json();
            console.log('[Invoice Creation] EFRIS fiscal data received:', efrisData);
            
            // Show the EFRIS fiscal invoice immediately
            setEfrisFiscalData(efrisData);
            setCreatedInvoiceId(invoiceId);
            setShowEfrisFiscalInvoice(true);
            setLoading(false);
            return; // Don't navigate yet, show the fiscal receipt first
          } catch (efrisErr) {
            alert('Invoice created but EFRIS fiscalization failed');
            router.push(`/${orgSlug}/accounts-receivable/invoices/${invoiceId}`);
            return;
          }
        }

        // Send email if requested
        if (shouldSendEmail) {
          try {
            const emailRes = await fetch(`/api/orgs/${orgSlug}/invoices/${invoiceId}/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (!emailRes.ok) {
              const emailError = await emailRes.json();
              alert(`Invoice created but email sending failed: ${emailError.error}`);
              // Still navigate to invoice detail
              router.push(`/${orgSlug}/accounts-receivable/invoices/${invoiceId}`);
              return;
            }
            
            alert('Invoice created and sent successfully!');
          } catch (emailErr) {
            alert('Invoice created but email sending failed');
            router.push(`/${orgSlug}/accounts-receivable/invoices/${invoiceId}`);
            return;
          }
        }

        router.push(`/${orgSlug}/accounts-receivable/invoices/${invoiceId}`);
      } else {
        const error = await res.json();
        console.error('Invoice creation failed:', error);
        alert(`Error creating invoice: ${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const name = c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim();
    return name.toLowerCase().includes(customerSearch.toLowerCase()) ||
           c.email?.toLowerCase().includes(customerSearch.toLowerCase());
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/${orgSlug}/accounts-receivable/invoices`)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Create Invoice</h1>
          </div>
        </div>

        {/* Validation Messages */}
        {validation && validation.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Validation Errors</h3>
                <ul className="list-disc list-inside text-sm text-red-800">
                  {validation.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {validation && validation.warnings && validation.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Warnings</h3>
                <ul className="list-disc list-inside text-sm text-yellow-800">
                  {validation.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          
          {/* Customer Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer <span className="text-red-500">*</span>
            </label>
            
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">
                    {selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                  </div>
                  <div className="text-sm text-gray-600">{selectedCustomer.email}</div>
                  {selectedCustomer.creditLimit && (
                    <div className="text-xs text-gray-500 mt-1">
                      Credit Limit: {formatCurrency(selectedCustomer.creditLimit, currency)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 hover:bg-blue-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerSearch(true);
                    }}
                    onFocus={() => setShowCustomerSearch(true)}
                    placeholder="Search customers by name or email..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {showCustomerSearch && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0"
                        >
                          <div className="font-medium">
                            {customer.companyName || `${customer.firstName} ${customer.lastName}`}
                          </div>
                          <div className="text-sm text-gray-600">{customer.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickAddCustomer(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  New customer
                </button>
              </div>
            )}
          </div>

          {/* EFRIS Buyer Classification & Payment Method */}
          {efrisEnabled && selectedCustomer && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">EFRIS Tax Compliance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={buyerType}
                    onChange={(e) => {
                      setBuyerType(e.target.value);
                      // Clear TIN if switching to B2C
                      if (e.target.value === '1') {
                        setCustomerTin('');
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">B2C (Business to Consumer)</option>
                    <option value="0">B2B (Business to Business - TIN required)</option>
                    <option value="3">B2G (Business to Government - TIN required)</option>
                    <option value="2">Foreigner (Non-resident)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-600">
                    {buyerType === '0' && 'Business customer - TIN is mandatory'}
                    {buyerType === '1' && 'Retail/walk-in customer - TIN optional'}
                    {buyerType === '2' && 'Non-resident customer'}
                    {buyerType === '3' && 'Government entity - TIN is mandatory'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="102">Cash</option>
                    <option value="101">Credit (Invoice)</option>
                    <option value="105">Mobile Money</option>
                    <option value="106">Visa/Master Card</option>
                    <option value="108">POS</option>
                    <option value="107">EFT (Bank Transfer)</option>
                    <option value="103">Cheque</option>
                    <option value="104">Demand Draft</option>
                    <option value="109">RTGS</option>
                    <option value="110">Swift Transfer</option>
                  </select>
                </div>
              </div>

              {/* TIN field - required for B2B and B2G */}
              {(buyerType === '0' || buyerType === '3') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer TIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerTin || selectedCustomer?.taxIdNumber || ''}
                    onChange={(e) => setCustomerTin(e.target.value)}
                    placeholder="Enter customer TIN number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-red-600">
                    TIN is required for {buyerType === '0' ? 'business' : 'government'} customers per EFRIS regulations
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Invoice Details */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="PO number or reference"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Tax Method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Calculation
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleTaxMethodToggle()}
                className={`px-4 py-2 rounded-lg ${
                  taxCalculationMethod === 'EXCLUSIVE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tax Exclusive
              </button>
              <button
                type="button"
                onClick={() => handleTaxMethodToggle()}
                className={`px-4 py-2 rounded-lg ${
                  taxCalculationMethod === 'INCLUSIVE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tax Inclusive
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {taxCalculationMethod === 'EXCLUSIVE' 
                ? 'Amount represents Net. Tax is calculated on top.'
                : 'Amount includes Tax. Net is calculated by extracting tax.'}
            </p>
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => addLineItem('product')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
                <button
                  onClick={() => addLineItem('service')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Service
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border border-gray-200 rounded-lg">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No line items yet. Click "Add Product" or "Add Service" above.</p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg" style={{ overflow: 'visible' }}>
                <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
                  <table className="w-full" style={{ overflow: 'visible' }}>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300">
                      <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase" style={{ width: '40px' }}>#</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product/Service</th>
                      <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase" style={{ width: '70px' }}>Qty</th>
                      <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase" style={{ width: '140px' }}>
                        Rate
                        {taxCalculationMethod === 'INCLUSIVE' && (
                          <span className="ml-1 text-[10px] font-normal text-blue-600">(incl. tax)</span>
                        )}
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase" style={{ width: '95px' }}>Disc</th>
                      <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase" style={{ width: '140px' }}>Amount</th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase" style={{ width: '160px' }}>Tax</th>
                      <th className="px-1 py-3" style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-2 py-3 text-center text-sm text-gray-600" style={{ width: '40px' }}>{index + 1}</td>
                        <td className="px-3 py-3">
                          <div className="relative">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                updateLineItem(item.id, { description: e.target.value });
                                setProductSearch(e.target.value);
                                setShowProductSearch(item.id);
                              }}
                              onFocus={(e) => {
                                setProductSearch('');
                                setShowProductSearch(item.id);
                              }}
                              onBlur={() => setTimeout(() => setShowProductSearch(null), 200)}
                              placeholder={`Search ${item.type}...`}
                              className={`w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 ${!item.description || item.description.trim() === '' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'}`}
                            />
                            
                            {showProductSearch === item.id && (
                              <div 
                                className="absolute z-[9999] w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto left-0 top-full" 
                                style={{ minWidth: '300px' }}
                                onMouseDown={(e) => e.preventDefault()}
                              >
                                {item.type === 'product' ? (
                                  filteredProducts.length > 0 ? (
                                    filteredProducts.map((product) => (
                                      <button
                                        key={product.id}
                                        onClick={() => selectProduct(item.id, product.id)}
                                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0"
                                      >
                                        <div className="flex justify-between">
                                          <span className="font-medium text-sm">{product.name}</span>
                                          <span className="text-sm text-gray-600">{formatCurrency(product.unitPrice, currency)}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-sm text-gray-500">
                                      No products found (Total: {products.length}, Search: "{productSearch}")
                                    </div>
                                  )
                                ) : (
                                  filteredServices.length > 0 ? (
                                    filteredServices.map((service) => (
                                      <button
                                        key={service.id}
                                        onClick={() => selectService(item.id, service.id)}
                                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0"
                                      >
                                        <div className="flex justify-between">
                                          <span className="font-medium text-sm">{service.name}</span>
                                          <span className="text-sm text-gray-600">{formatCurrency(service.rate, currency)}</span>
                                        </div>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-sm text-gray-500">
                                      No services found (Total: {services.length})
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                            
                            {item.availableStock !== undefined && (
                              <div className={`text-xs mt-1 ${item.availableStock < item.quantity ? 'text-red-600' : 'text-green-600'}`}>
                                Stock: {item.availableStock} available
                              </div>
                            )}
                        </td>
                        <td className="px-2 py-3" style={{ width: '70px' }}>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = parseFloat(e.target.value) || 0;
                              if (qty < 0) {
                                alert('Quantity cannot be negative');
                                return;
                              }
                              updateLineItem(item.id, { quantity: qty });
                            }}
                            min="0"
                            step="0.01"
                            className={`w-full px-2 py-2 text-sm text-center border rounded focus:ring-2 focus:ring-blue-500 ${
                              item.availableStock !== undefined && item.quantity > item.availableStock
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="px-2 py-3" style={{ width: '140px' }}>
                          <input
                            type="number"
                            value={item.displayRate || 0}
                            onChange={(e) => {
                              const newDisplayRate = parseFloat(e.target.value) || 0;
                              if (newDisplayRate < 0) {
                                alert('Price cannot be negative');
                                return;
                              }
                              updateLineItem(item.id, { displayRate: newDisplayRate });
                            }}
                            min="0"
                            step="0.01"
                            className={`w-full px-2 py-2 text-sm text-right border rounded focus:ring-2 focus:ring-blue-500 ${
                                (item.displayRate || 0) === 0 && item.description
                                  ? 'border-yellow-500 bg-yellow-50'
                                  : 'border-gray-300'
                              }`}
                          />
                        </td>
                        <td className="px-2 py-3" style={{ width: '95px' }}>
                          <div className="flex gap-0.5">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => {
                                const discount = parseFloat(e.target.value) || 0;
                                if (discount < 0) {
                                  alert('Discount cannot be negative');
                                  return;
                                }
                                
                                // Validate based on discount type
                                if (item.discountType === 'PERCENTAGE') {
                                  if (discount > 100) {
                                    alert('Percentage discount cannot exceed 100%');
                                    return;
                                  }
                                } else {
                                  // Amount discount
                                  const lineSubtotal = (item.displayRate || 0) * item.quantity;
                                  if (discount > lineSubtotal) {
                                    alert(`Discount cannot exceed line amount (${formatCurrency(lineSubtotal, currency)})`);
                                    return;
                                  }
                                }
                                
                                updateLineItem(item.id, { discount });
                              }}
                              min="0"
                              step="0.01"
                              max={item.discountType === 'PERCENTAGE' ? "100" : undefined}
                              className="w-12 px-1 py-1.5 text-xs text-right border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                            <select
                              value={item.discountType}
                              onChange={(e) => {
                                const newType = e.target.value as 'AMOUNT' | 'PERCENTAGE';
                                updateLineItem(item.id, { discountType: newType, discount: 0 });
                              }}
                              className="w-9 px-0 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="AMOUNT">{currency}</option>
                              <option value="PERCENTAGE">%</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-right" style={{ width: '140px' }}>
                          <span className="text-sm font-medium">{formatCurrency(item.quantity * (item.displayRate || 0), currency)}</span>
                        </td>
                        <td className="px-2 py-3" style={{ width: '160px' }}>
                          <select
                            value={item.taxRateId || ''}
                            onChange={(e) => updateLineItem(item.id, { taxRateId: e.target.value || undefined })}
                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">No Tax</option>
                            {taxRates.map(rate => (
                              <option key={rate.id} value={rate.id}>
                                {rate.displayName || rate.name} ({rate.rate}%)
                              </option>
                            ))}
                          </select>
                          {item.taxAmount > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Tax: {formatCurrency(item.taxAmount, currency)}
                            </div>
                          )}
                        </td>
                        <td className="px-1 py-3 text-center" style={{ width: '40px' }}>
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes or terms..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Summary</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium text-red-600">-{formatCurrency(totalDiscount, currency)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">{formatCurrency(totalTax, currency)}</span>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-xl font-bold text-blue-600">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={validateInvoice}
              disabled={validating || !selectedCustomer || items.length === 0}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {validating ? 'Validating...' : 'Validate'}
            </button>
            
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading || !selectedCustomer || items.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            
            <button
              type="button"
              onClick={() => handleSubmit(false, true)}
              disabled={loading || !selectedCustomer || items.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Saving...' : 'Save and send'}
            </button>
            
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading || !selectedCustomer || items.length === 0}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Saving...' : 'Save and Fiscalize with EFRIS'}
            </button>
          </div>
        </div>

      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Invoice Preview</h2>
              <button onClick={() => setShowPrintPreview(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8" style={{ backgroundColor: customisation.primaryColor + '10' }}>
              <div className="bg-white p-8 shadow-sm mx-auto" style={{ maxWidth: '800px' }}>
                {/* Invoice Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    {customisation.showLogo && customisation.companyLogo && (
                      <img src={customisation.companyLogo} alt="Logo" className="h-16 mb-4" />
                    )}
                    <h1 className="text-3xl font-bold" style={{ color: customisation.primaryColor }}>INVOICE</h1>
                    <p className="text-gray-600 mt-2">{organization?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Invoice Date</p>
                    <p className="font-medium">{new Date(invoiceDate).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-600 mt-2">Due Date</p>
                    <p className="font-medium">{new Date(dueDate).toLocaleDateString()}</p>
                    {reference && (
                      <>
                        <p className="text-sm text-gray-600 mt-2">Reference</p>
                        <p className="font-medium">{reference}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Bill To */}
                <div className="mb-8">
                  <p className="text-sm font-semibold text-gray-600 mb-2">BILL TO:</p>
                  <p className="font-medium">{selectedCustomer?.companyName || `${selectedCustomer?.firstName} ${selectedCustomer?.lastName}`}</p>
                  {selectedCustomer?.email && <p className="text-sm text-gray-600">{selectedCustomer.email}</p>}
                </div>

                {/* Line Items */}
                <table className="w-full mb-8">
                  <thead>
                    <tr className="border-b-2" style={{ borderColor: customisation.primaryColor }}>
                      <th className="text-left py-2 text-sm font-semibold">Description</th>
                      <th className="text-center py-2 text-sm font-semibold">Qty</th>
                      <th className="text-right py-2 text-sm font-semibold">Rate</th>
                      <th className="text-right py-2 text-sm font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-3">{item.description}</td>
                        <td className="py-3 text-center">{item.quantity}</td>
                        <td className="py-3 text-right">{formatCurrency(item.displayRate, currency)}</td>
                        <td className="py-3 text-right font-medium">{formatCurrency((item.displayRate || 0) * item.quantity, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-64">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-red-600">-{formatCurrency(totalDiscount, currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">{formatCurrency(totalTax, currency)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-t-2 text-lg font-bold" style={{ borderColor: customisation.primaryColor }}>
                      <span>Total:</span>
                      <span style={{ color: customisation.primaryColor }}>{formatCurrency(total, currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {customisation.showNotes && notes && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-600 mb-1">NOTES:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Setup Modal */}
      {showRecurringSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Make Recurring Invoice</h2>
              <button onClick={() => setShowRecurringSetup(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                <select
                  value={recurringConfig.frequency}
                  onChange={(e) => setRecurringConfig({ ...recurringConfig, frequency: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={recurringConfig.startDate}
                    onChange={(e) => setRecurringConfig({ ...recurringConfig, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date (Optional)</label>
                  <input
                    type="date"
                    value={recurringConfig.endDate}
                    onChange={(e) => setRecurringConfig({ ...recurringConfig, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Occurrences (Optional)</label>
                <input
                  type="number"
                  value={recurringConfig.maxOccurrences}
                  onChange={(e) => setRecurringConfig({ ...recurringConfig, maxOccurrences: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoSend"
                  checked={recurringConfig.autoSend}
                  onChange={(e) => setRecurringConfig({ ...recurringConfig, autoSend: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="autoSend" className="text-sm text-gray-700">
                  Automatically send invoices to customer
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Preview:</strong> This invoice will be created {recurringConfig.frequency.toLowerCase()} 
                  starting from {new Date(recurringConfig.startDate).toLocaleDateString()}
                  {recurringConfig.endDate && ` until ${new Date(recurringConfig.endDate).toLocaleDateString()}`}
                  {recurringConfig.maxOccurrences && ` for ${recurringConfig.maxOccurrences} times`}.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button
                onClick={() => setShowRecurringSetup(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert(`Recurring invoice configured: ${recurringConfig.frequency}`);
                  setShowRecurringSetup(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Recurring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customisation Modal */}
      {showCustomisation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Customise Invoice Template</h2>
              <button onClick={() => setShowCustomisation(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Style</label>
                <div className="grid grid-cols-3 gap-3">
                  {['classic', 'modern', 'minimal'].map((template) => (
                    <button
                      key={template}
                      onClick={() => setCustomisation({ ...customisation, template: template as any })}
                      className={`p-4 border-2 rounded-lg text-center capitalize ${
                        customisation.template === template
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={customisation.primaryColor}
                    onChange={(e) => setCustomisation({ ...customisation, primaryColor: e.target.value })}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customisation.primaryColor}
                    onChange={(e) => setCustomisation({ ...customisation, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo URL (Optional)</label>
                <input
                  type="text"
                  value={customisation.companyLogo}
                  onChange={(e) => setCustomisation({ ...customisation, companyLogo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Display Options</label>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showLogo"
                    checked={customisation.showLogo}
                    onChange={(e) => setCustomisation({ ...customisation, showLogo: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="showLogo" className="text-sm text-gray-700">Show company logo</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showNotes"
                    checked={customisation.showNotes}
                    onChange={(e) => setCustomisation({ ...customisation, showNotes: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="showNotes" className="text-sm text-gray-700">Show notes section</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showTerms"
                    checked={customisation.showTerms}
                    onChange={(e) => setCustomisation({ ...customisation, showTerms: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="showTerms" className="text-sm text-gray-700">Show terms & conditions</label>
                </div>
              </div>

              {/* Preview */}
              <div className="border-2 border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Preview:</p>
                <div className="bg-gray-50 p-4 rounded" style={{ borderTop: `4px solid ${customisation.primaryColor}` }}>
                  <div className="flex justify-between items-start mb-2">
                    {customisation.showLogo && customisation.companyLogo && (
                      <div className="w-12 h-12 bg-gray-300 rounded" />
                    )}
                    <h3 className="text-xl font-bold" style={{ color: customisation.primaryColor }}>INVOICE</h3>
                  </div>
                  <div className="h-20 bg-white rounded mt-2"></div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button
                onClick={() => setShowCustomisation(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Template customisation saved!');
                  setShowCustomisation(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showQuickAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-semibold">Quick Add Customer</h2>
              <button onClick={() => setShowQuickAddCustomer(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={quickCustomerForm.firstName}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={quickCustomerForm.lastName}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={quickCustomerForm.companyName}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={quickCustomerForm.email}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={quickCustomerForm.phone}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+256 XXX XXX XXX"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={quickCustomerForm.currency}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (days)</label>
                  <input
                    type="number"
                    value={quickCustomerForm.paymentTerms}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, paymentTerms: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t rounded-b-lg">
              <button
                onClick={() => setShowQuickAddCustomer(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAddCustomer}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EFRIS Fiscal Invoice Modal */}
      {showEfrisFiscalInvoice && efrisFiscalData && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <EfrisFiscalInvoice
            fiscalData={efrisFiscalData}
            onClose={() => {
              setShowEfrisFiscalInvoice(false);
              // Navigate to the invoice detail page
              if (createdInvoiceId) {
                router.push(`/${orgSlug}/accounts-receivable/invoices/${createdInvoiceId}`);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
