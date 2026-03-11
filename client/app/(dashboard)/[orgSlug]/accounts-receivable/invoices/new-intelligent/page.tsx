'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Plus, Trash2, Save, AlertCircle, CheckCircle, 
  Upload, X, Package, DollarSign, CreditCard, TrendingUp,
  Eye, FileText, Send
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useBranch } from '@/hooks/useBranch';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

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
  discount: number;       // raw user input (% value or dollar amount)
  discountAmount: number; // computed dollar discount amount
  discountType: 'AMOUNT' | 'PERCENTAGE';
  taxRateId?: string;
  warehouseId?: string;
  availableStock?: number;
  subtotal: number;
  taxAmount: number;
  total: number;
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
  const { branchId } = useBranch();

  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [currencies, setCurrencies] = useState<{ code: string; name: string; symbol: string; isBase: boolean }[]>([]);
  const [revenueAccounts, setRevenueAccounts] = useState<{ id: string; code: string; name: string }[]>([]);
  const [resolvedWarehouseId, setResolvedWarehouseId] = useState<string | null>(null);
  
  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [taxCalculationMethod, setTaxCalculationMethod] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
  const [revenueAccountId, setRevenueAccountId] = useState<string>('');
  const [reference, setReference] = useState('');

  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<string>('102'); // Default to Cash

  // UI state
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  
  // Modal states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showRecurringSetup, setShowRecurringSetup] = useState(false);
  const [showCustomisation, setShowCustomisation] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
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
  const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const total = subtotal - totalDiscount + totalTax;

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchServices();
    fetchTaxRates();
    fetchCurrencies();
    fetchRevenueAccounts();
    resolveDefaultWarehouse();
  }, [orgSlug]);

  const fetchCurrencies = async () => {
    try {
      const res = await fetch(`/api/${orgSlug}/currencies`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setCurrencies(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching currencies:', err);
    }
  };

  const fetchRevenueAccounts = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts?type=REVENUE`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setRevenueAccounts(data.data.map((a: any) => ({ id: a.id, code: a.code, name: a.name })));
        }
      }
    } catch (err) {
      console.error('Error fetching revenue accounts:', err);
    }
  };

  const fetchExchangeRate = async (fromCurrency: string) => {
    if (!baseCurrency || fromCurrency === baseCurrency) {
      setExchangeRate(1);
      return;
    }
    try {
      // 1. Try org's stored exchange rates first
      let found = false;
      const res = await fetch(`/api/${orgSlug}/exchange-rates?date=${invoiceDate || new Date().toISOString().split('T')[0]}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const rate = data.data.find(
            (r: any) => r.fromCurrencyCode === fromCurrency && r.toCurrencyCode === baseCurrency
          ) || data.data.find(
            (r: any) => r.fromCurrencyCode === baseCurrency && r.toCurrencyCode === fromCurrency
          );
          if (rate) {
            const rateValue = rate.fromCurrencyCode === fromCurrency
              ? Number(rate.rate)
              : 1 / Number(rate.rate);
            setExchangeRate(rateValue);
            found = true;
          }
        }
      }

      // 2. Fallback: fetch live rate from free API
      if (!found) {
        const liveRes = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`);
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          if (liveData.result === 'success' && liveData.rates?.[baseCurrency]) {
            setExchangeRate(Number(liveData.rates[baseCurrency]));
            return;
          }
        }
        // 3. Try reverse lookup (base -> foreign)
        const reverseRes = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
        if (reverseRes.ok) {
          const reverseData = await reverseRes.json();
          if (reverseData.result === 'success' && reverseData.rates?.[fromCurrency]) {
            setExchangeRate(Number((1 / reverseData.rates[fromCurrency]).toFixed(6)));
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
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
      setExchangeRate(1);
    }
  }, [baseCurrency]);

  useEffect(() => {
    // Set currency from customer if available
    if (selectedCustomer?.currency) {
      setCurrency(selectedCustomer.currency);
      fetchExchangeRate(selectedCustomer.currency);
    } else if (baseCurrency) {
      // Reset to base currency if customer is cleared
      setCurrency(baseCurrency);
      setExchangeRate(1);
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

  // Auto-resolve warehouse: find the default warehouse for the user's active branch
  const resolveDefaultWarehouse = async () => {
    try {
      const branchParam = branchId ? `&branchId=${branchId}` : '';
      const res = await fetch(`/api/orgs/${orgSlug}/warehouses?isDefault=true${branchParam}`);
      if (res.ok) {
        const data = await res.json();
        const list = data.warehouses || data.data || [];
        // Pick the default warehouse for the branch, or first warehouse
        const defaultWh = list.find((w: any) => w.isDefault) || list[0];
        setResolvedWarehouseId(defaultWh?.id || null);
      }
    } catch (error) {
      console.error('Error resolving default warehouse:', error);
    }
  };

  // Re-resolve warehouse when branch changes
  useEffect(() => {
    if (orgSlug) resolveDefaultWarehouse();
  }, [branchId]);

  const fetchWarehouseStock = async (warehouseId: string, productId: string): Promise<number> => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/warehouses/${warehouseId}/stock?productId=${productId}`);
      if (res.ok) {
        const data = await res.json();
        return data.quantityAvailable ?? data.available ?? 0;
      }
    } catch (error) {
      console.error('Error fetching warehouse stock:', error);
    }
    return 0;
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
        toast.error(error.message || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
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
      discountAmount: 0,
      discountType: 'AMOUNT',
      taxRateId: undefined,
      warehouseId: type === 'product' ? (resolvedWarehouseId || undefined) : undefined,
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
        discountAmount: lineCalc.lineDiscount,
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
          customerId: selectedCustomer!.id,
          invoiceDate,
          dueDate,
          currency,
          exchangeRate: currency !== baseCurrency ? exchangeRate : 1,
          branchId: branchId || undefined,
          taxCalculationMethod,
          revenueAccountId: revenueAccountId || undefined,
          reference,
          notes,
          attachments: attachmentUrls,
          items: items.map(item => ({
            productId: item.productId,
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: taxCalculationMethod === 'INCLUSIVE' ? item.displayRate : item.unitPrice,
            discount: item.discount,
            discountType: item.discountType,
            taxRateId: item.taxRateId,
            warehouseId: item.warehouseId || resolvedWarehouseId || undefined,
          })),
          autoCommitInventory: true,
          autoSubmitToTaxAuthority: false,
        }),
      });

      if (res.ok) {
        const invoice = await res.json();
        const invoiceId = invoice.id;

        // Fiscalize if requested
        if (shouldFiscalizeWithEfris) {
          toast.info('Invoice created successfully.');
          router.push(`/${orgSlug}/accounts-receivable/invoices/${invoiceId}`);
          return;
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
              toast.error(`Invoice created but email sending failed: ${emailError.error}`);
              router.push(`/${orgSlug}/accounts-receivable/invoices/${invoiceId}`);
              return;
            }
            
            toast.success('Invoice created and sent successfully!');
          } catch (emailErr) {
            toast.error('Invoice created but email sending failed');
            router.push(`/${orgSlug}/accounts-receivable/invoices/${invoiceId}`);
            return;
          }
        }

        router.push(`/${orgSlug}/accounts-receivable/invoices/${invoiceId}`);
      } else {
        const error = await res.json();
        console.error('Invoice creation failed:', error);
        toast.error(`Error creating invoice: ${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    <div className="min-h-screen bg-gray-50/80">
      {/* ── Sticky Top Navigation ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/${orgSlug}/accounts-receivable/invoices`)}
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">New Invoice</h1>
                <p className="text-xs text-gray-500">{organization?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintPreview(true)}
                disabled={items.length === 0}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Preview Invoice"
              >
                <Eye className="w-4 h-4 inline mr-1 -mt-0.5" />
                Preview
              </button>
              {createdInvoiceId && (
                <button
                  type="button"
                  onClick={() => window.open(`/api/orgs/${orgSlug}/invoices/${createdInvoiceId}/pdf`, '_blank')}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Open PDF in new tab"
                >
                  <FileText className="w-4 h-4 inline mr-1 -mt-0.5" />
                  PDF
                </button>
              )}
              <button
                type="button"
                onClick={validateInvoice}
                disabled={validating || !selectedCustomer || items.length === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {validating ? 'Validating...' : 'Validate'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={loading || !selectedCustomer || items.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false, true)}
                disabled={loading || !selectedCustomer || items.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving...' : 'Save & Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-[1800px] mx-auto px-8 py-6">

        {/* Validation Messages */}
        {validation && validation.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <div className="flex gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 text-sm">Please fix the following errors</p>
                <ul className="mt-1 list-disc list-inside text-sm text-red-700 space-y-0.5">
                  {validation.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {validation && validation.warnings && validation.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <div className="flex gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Warnings</p>
                <ul className="mt-1 list-disc list-inside text-sm text-amber-700 space-y-0.5">
                  {validation.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Full-Width Form ── */}
        <div className="space-y-5">

            {/* Card: Customer & Invoice Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Customer Section */}
              <div className="p-5 border-b border-gray-100">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                  Bill To <span className="text-red-400">*</span>
                </label>
                
                {selectedCustomer ? (
                  <div className="flex items-start justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                      </p>
                      {selectedCustomer.email && (
                        <p className="text-sm text-gray-500 mt-0.5">{selectedCustomer.email}</p>
                      )}
                      {selectedCustomer.creditLimit && (
                        <p className="text-xs text-gray-400 mt-1">
                          Credit Limit: {formatCurrency(selectedCustomer.creditLimit, currency)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
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
                        className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      />
                      
                      {showCustomerSearch && filteredCustomers.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => handleCustomerSelect(customer)}
                              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                            >
                              <p className="font-medium text-sm text-gray-900">
                                {customer.companyName || `${customer.firstName} ${customer.lastName}`}
                              </p>
                              <p className="text-xs text-gray-500">{customer.email}</p>
                            </button>
                          ))}
                        </div>
                      )}

                      {showCustomerSearch && customerSearch.length > 0 && filteredCustomers.length === 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-center">
                          <p className="text-sm text-gray-500 mb-2">No customers found for &ldquo;{customerSearch}&rdquo;</p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomerSearch(false);
                              setQuickCustomerForm({ ...quickCustomerForm, companyName: customerSearch });
                              setShowQuickAddCustomer(true);
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            + Create &ldquo;{customerSearch}&rdquo; as a new customer
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddCustomer(true)}
                      className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      + New customer
                    </button>
                  </div>
                )}
              </div>

              {/* Invoice Details Grid */}
              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Invoice Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Due Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Reference
                    </label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="PO number"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Tax Method
                    </label>
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => { if (taxCalculationMethod !== 'EXCLUSIVE') handleTaxMethodToggle(); }}
                        className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                          taxCalculationMethod === 'EXCLUSIVE'
                            ? 'bg-gray-900 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Exclusive
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (taxCalculationMethod !== 'INCLUSIVE') handleTaxMethodToggle(); }}
                        className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                          taxCalculationMethod === 'INCLUSIVE'
                            ? 'bg-gray-900 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Inclusive
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Currency Row */}
              <div className="px-5 pb-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Currency
                    </label>
                    {currencies.length > 0 ? (
                      <select
                        value={currency}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrency(val);
                          fetchExchangeRate(val);
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        {currencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                        maxLength={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      />
                    )}
                  </div>
                  {currency && baseCurrency && currency !== baseCurrency && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Exchange Rate
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                          min="0.000001"
                          step="0.0001"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        1 {currency} = {exchangeRate} {baseCurrency} (live rate — editable)
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Revenue Account
                    </label>
                    <select
                      value={revenueAccountId}
                      onChange={(e) => setRevenueAccountId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">Default — Sales Revenue (4000)</option>
                      {revenueAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Line Items */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm" style={{ overflow: 'visible' }}>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Line Items</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => addLineItem('product')}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Product
                  </button>
                  <button
                    onClick={() => addLineItem('service')}
                    className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Service
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-400 font-medium">No items added yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click &quot;Product&quot; or &quot;Service&quot; above to add line items</p>
                </div>
              ) : (
                <div style={{ overflow: 'visible' }}>
                  <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
                    <table className="w-full text-sm" style={{ overflow: 'visible' }}>
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200">
                          <th className="pl-5 pr-2 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ width: '40px' }}>#</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ minWidth: '250px' }}>Item</th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ width: '100px' }}>Qty</th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ width: '160px' }}>
                            Rate
                            {taxCalculationMethod === 'INCLUSIVE' && (
                              <span className="ml-1 text-[9px] font-normal text-blue-500">(incl.)</span>
                            )}
                          </th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ width: '140px' }}>Disc</th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ width: '170px' }}>Amount</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ width: '220px' }}>Tax</th>

                          <th className="px-2 py-2.5" style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item, index) => (
                          <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                            <td className="pl-5 pr-2 py-3 text-center text-xs text-gray-400 font-medium">{index + 1}</td>
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
                                  className={`w-full px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 transition-shadow ${!item.description || item.description.trim() === '' ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'}`}
                                />
                                
                                {showProductSearch === item.id && (
                                  <div 
                                    className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-64 overflow-y-auto left-0 top-full" 
                                    style={{ minWidth: '300px' }}
                                    onMouseDown={(e) => e.preventDefault()}
                                  >
                                    {item.type === 'product' ? (
                                      filteredProducts.length > 0 ? (
                                        filteredProducts.map((product) => (
                                          <button
                                            key={product.id}
                                            onClick={() => selectProduct(item.id, product.id)}
                                            className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                                          >
                                            <div className="flex justify-between">
                                              <span className="font-medium text-sm text-gray-900">{product.name}</span>
                                              <span className="text-sm text-gray-500 tabular-nums">{formatCurrency(product.unitPrice, currency)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                              <span>SKU: {product.sku}</span>
                                          </div>
                                          </button>
                                        ))
                                      ) : (
                                        <div className="px-3 py-3 text-sm text-gray-400 text-center">
                                          No products found
                                        </div>
                                      )
                                    ) : (
                                      filteredServices.length > 0 ? (
                                        filteredServices.map((service) => (
                                          <button
                                            key={service.id}
                                            onClick={() => selectService(item.id, service.id)}
                                            className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                                          >
                                            <div className="flex justify-between">
                                              <span className="font-medium text-sm text-gray-900">{service.name}</span>
                                              <span className="text-sm text-gray-500 tabular-nums">{formatCurrency(service.rate, currency)}</span>
                                            </div>
                                          </button>
                                        ))
                                      ) : (
                                        <div className="px-3 py-3 text-sm text-gray-400 text-center">
                                          No services found
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                                
                              {item.availableStock !== undefined && (
                                <div className={`text-[10px] mt-1 font-medium ${item.availableStock < item.quantity ? 'text-red-500' : 'text-emerald-600'}`}>
                                  Stock: {item.availableStock} available
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3" style={{ width: '100px' }}>
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
                                className={`w-full px-3 py-1.5 text-sm text-center border rounded-md focus:ring-2 focus:ring-blue-500 transition-shadow ${
                                  item.availableStock !== undefined && item.quantity > item.availableStock
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-gray-200'
                                }`}
                              />
                            </td>
                            <td className="px-3 py-3" style={{ width: '160px' }}>
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
                                className={`w-full px-2 py-1.5 text-sm text-right border rounded-md focus:ring-2 focus:ring-blue-500 transition-shadow ${
                                    (item.displayRate || 0) === 0 && item.description
                                      ? 'border-amber-400 bg-amber-50'
                                      : 'border-gray-200'
                                  }`}
                              />
                            </td>
                            <td className="px-3 py-3" style={{ width: '140px' }}>
                              <div className="flex gap-1">
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
                                  className="flex-1 min-w-0 px-2 py-1.5 text-xs text-right border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500"
                                />
                                <select
                                  value={item.discountType}
                                  onChange={(e) => {
                                    const newType = e.target.value as 'AMOUNT' | 'PERCENTAGE';
                                    updateLineItem(item.id, { discountType: newType, discount: 0 });
                                  }}
                                  className="w-14 px-1 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="AMOUNT">{currency}</option>
                                  <option value="PERCENTAGE">%</option>
                                </select>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums" style={{ width: '170px' }}>
                              <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.quantity * (item.displayRate || 0), currency)}</span>
                            </td>
                            <td className="px-3 py-3" style={{ width: '220px' }}>
                              <select
                                value={item.taxRateId || ''}
                                onChange={(e) => updateLineItem(item.id, { taxRateId: e.target.value || undefined })}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">No Tax</option>
                                {taxRates.map(rate => (
                                  <option key={rate.id} value={rate.id}>
                                    {rate.displayName || rate.name} ({rate.rate}%)
                                  </option>
                                ))}
                              </select>
                              {item.taxAmount > 0 && (
                                <div className="text-[10px] text-gray-400 mt-0.5 tabular-nums font-medium">
                                  Tax: {formatCurrency(item.taxAmount, currency)}
                                </div>
                              )}
                            </td>

                            <td className="px-2 py-3 text-center" style={{ width: '40px' }}>
                              <button
                                type="button"
                                onClick={() => removeLineItem(item.id)}
                                className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
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

            {/* Summary — right-aligned totals */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex justify-end">
                  <div className="w-full max-w-sm space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(subtotal, currency)}</span>
                    </div>

                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Discount</span>
                        <span className="font-medium text-red-600 tabular-nums">-{formatCurrency(totalDiscount, currency)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax (VAT)</span>
                      <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(totalTax, currency)}</span>
                    </div>

                    <div className="pt-3 mt-1 border-t-2 border-gray-900">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Total</span>
                        <span className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(total, currency)}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 text-right mt-0.5 uppercase">{currency}</p>
                      {currency !== baseCurrency && exchangeRate !== 1 && (
                        <p className="text-[10px] text-gray-400 text-right mt-1">
                          ≈ {formatCurrency(total * exchangeRate, baseCurrency)} {baseCurrency}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Notes / Terms */}}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Notes / Terms</label>
              </div>
              <div className="p-5">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Payment terms, delivery notes, or internal comments..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder:text-gray-300"
                />
              </div>
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

    </div>
  );
}
