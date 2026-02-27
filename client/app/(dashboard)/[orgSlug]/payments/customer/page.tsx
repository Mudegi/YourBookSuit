'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowLeft,
  Smartphone,
  Zap,
  Plus,
  Trash2,
  Search,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';

// ──────────── Types ────────────

interface Customer {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: string;
  amountPaid: number;
  amountDue: number;
}

interface BankAccount {
  id: string;
  code: string;
  name: string;
}

interface AllocationRow {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  amountDue: number;
  allocatedAmount: number;
}

// ──────────── Component ────────────

export default function CustomerPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const preselectedCustomerId = searchParams.get('customerId');
  const preselectedInvoiceId = searchParams.get('invoiceId');

  const { currency } = useOrganization();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  const [formData, setFormData] = useState({
    customerId: preselectedCustomerId || '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'BANK_TRANSFER',
    bankAccountId: '',
    referenceNumber: '',
    notes: '',
    mobileMoneyProvider: '',
    mobileMoneyTxnId: '',
  });

  const [allocations, setAllocations] = useState<AllocationRow[]>([]);

  const isMobileMoney = formData.paymentMethod === 'MOBILE_MONEY';
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
  const unappliedAmount = formData.amount - totalAllocated;
  const isPrePayment = formData.amount > 0 && totalAllocated < formData.amount - 0.01;

  // Filtered customers
  const filteredCustomers = customerSearch
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers;

  useEffect(() => {
    fetchData();
  }, [orgSlug]);

  useEffect(() => {
    if (formData.customerId) {
      fetchCustomerInvoices(formData.customerId);
    } else {
      setCustomerInvoices([]);
      setAllocations([]);
    }
  }, [formData.customerId]);

  async function fetchData() {
    try {
      setLoading(true);
      const [customersRes, accountsRes] = await Promise.all([
        fetch(`/api/orgs/${orgSlug}/customers?isActive=true`),
        fetch(`/api/orgs/${orgSlug}/chart-of-accounts`),
      ]);

      if (!customersRes.ok || !accountsRes.ok) throw new Error('Failed to fetch data');

      const customersData = await customersRes.json();
      const accountsData = await accountsRes.json();

      setCustomers(customersData.customers || customersData.data || []);
      const allAccounts = accountsData.accounts || accountsData.data || [];
      setBankAccounts(
        allAccounts.filter(
          (acc: BankAccount) => acc.code.startsWith('1') && !acc.code.startsWith('12'),
        ),
      );
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomerInvoices(customerId: string) {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/invoices?customerId=${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
      const allInvoices = data.invoices || data.data || [];

      const invoicesWithAmounts = allInvoices.map((inv: any) => {
        const totalAmount = Number(inv.total || inv.totalAmount || 0);
        const amountPaid = 0;
        return { ...inv, totalAmount, amountPaid, amountDue: totalAmount - amountPaid };
      });

      const unpaid = invoicesWithAmounts.filter(
        (inv: Invoice) => inv.status !== 'DRAFT' && inv.status !== 'PAID' && inv.amountDue > 0,
      );
      setCustomerInvoices(unpaid);

      // Preselect invoice if provided
      if (preselectedInvoiceId) {
        const inv = invoicesWithAmounts.find((i: Invoice) => i.id === preselectedInvoiceId);
        if (inv && inv.amountDue > 0) handleAddInvoice(inv);
      }
    } catch (err) {
      console.error('Failed to fetch customer invoices:', err);
    }
  }

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddInvoice(invoice: Invoice) {
    if (allocations.some((a) => a.invoiceId === invoice.id)) return;
    const row: AllocationRow = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      amountDue: invoice.amountDue,
      allocatedAmount: invoice.amountDue,
    };
    const newAllocations = [...allocations, row];
    setAllocations(newAllocations);
    updatePaymentAmount(newAllocations);
  }

  function handleRemoveInvoice(invoiceId: string) {
    const updated = allocations.filter((a) => a.invoiceId !== invoiceId);
    setAllocations(updated);
    updatePaymentAmount(updated);
  }

  function handleAllocationChange(invoiceId: string, amount: number) {
    const updated = allocations.map((a) =>
      a.invoiceId === invoiceId ? { ...a, allocatedAmount: amount } : a,
    );
    setAllocations(updated);
    updatePaymentAmount(updated);
  }

  function updatePaymentAmount(allocs: AllocationRow[]) {
    const total = allocs.reduce((sum, a) => sum + a.allocatedAmount, 0);
    setFormData((prev) => ({ ...prev, amount: Math.round(total * 100) / 100 }));
  }

  // Auto-allocate: FIFO across available invoices
  function handleAutoAllocate() {
    if (formData.amount <= 0) return;
    let remaining = formData.amount;
    const available = customerInvoices.filter(
      (inv) => !allocations.some((a) => a.invoiceId === inv.id),
    );

    const newAllocations: AllocationRow[] = [...allocations];

    for (const inv of available) {
      if (remaining <= 0.01) break;
      const apply = Math.min(remaining, inv.amountDue);
      newAllocations.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: inv.totalAmount,
        amountDue: inv.amountDue,
        allocatedAmount: apply,
      });
      remaining -= apply;
    }

    setAllocations(newAllocations);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.customerId) throw new Error('Please select a customer');
      if (!formData.bankAccountId) throw new Error('Please select a bank account');
      if (formData.amount <= 0) throw new Error('Payment amount must be greater than zero');
      if (isMobileMoney && !formData.mobileMoneyProvider) throw new Error('Please select a Mobile Money provider');

      const payload = {
        customerId: formData.customerId,
        paymentDate: formData.paymentDate,
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.bankAccountId,
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
        mobileMoneyProvider: isMobileMoney ? formData.mobileMoneyProvider : undefined,
        mobileMoneyTxnId: isMobileMoney ? formData.mobileMoneyTxnId : undefined,
        invoiceAllocations: allocations.map((a) => ({
          invoiceId: a.invoiceId,
          amount: a.allocatedAmount,
        })),
      };

      const response = await fetch(`/api/orgs/${orgSlug}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record payment');
      }

      const payment = await response.json();
      router.push(`/${orgSlug}/payments/${payment.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const availableInvoices = customerInvoices.filter(
    (inv) => !allocations.some((a) => a.invoiceId === inv.id),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link href={`/${orgSlug}/payments`} className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Payments
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
            <ArrowDownLeft className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Record Customer Payment</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Money In — Receipt from customer</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer *</label>
              <select
                value={formData.customerId}
                onChange={(e) => handleChange('customerId', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date *</label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => handleChange('paymentDate', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Bank Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deposit To *</label>
              <select
                value={formData.bankAccountId}
                onChange={(e) => handleChange('bankAccountId', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              >
                <option value="">Select bank account...</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method *</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleChange('paymentMethod', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="CHECK">Check</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="ONLINE_PAYMENT">Online Payment</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Mobile Money Fields */}
            {isMobileMoney && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span className="flex items-center gap-1"><Smartphone className="w-4 h-4" /> Network *</span>
                  </label>
                  <select
                    value={formData.mobileMoneyProvider}
                    onChange={(e) => handleChange('mobileMoneyProvider', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  >
                    <option value="">Select provider...</option>
                    <option value="MTN">MTN Mobile Money</option>
                    <option value="AIRTEL">Airtel Money</option>
                    <option value="MPESA">M-Pesa</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span className="flex items-center gap-1"><Smartphone className="w-4 h-4" /> Transaction ID</span>
                  </label>
                  <input
                    type="text"
                    value={formData.mobileMoneyTxnId}
                    onChange={(e) => handleChange('mobileMoneyTxnId', e.target.value)}
                    placeholder="e.g. MP240101XXXX"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>
              </>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Number</label>
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={(e) => handleChange('referenceNumber', e.target.value)}
                placeholder="Check number or transaction ID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Invoice Allocations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Apply to Invoices</h2>
            {formData.customerId && availableInvoices.length > 0 && formData.amount > 0 && (
              <button
                type="button"
                onClick={handleAutoAllocate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/60 text-sm font-medium transition-colors"
              >
                <Zap className="w-4 h-4" /> Auto-Allocate (FIFO)
              </button>
            )}
          </div>

          {/* Add Invoice */}
          {formData.customerId && availableInvoices.length > 0 && (
            <div className="mb-4">
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                onChange={(e) => {
                  const inv = customerInvoices.find((i) => i.id === e.target.value);
                  if (inv) handleAddInvoice(inv);
                  e.target.value = '';
                }}
              >
                <option value="">+ Add invoice...</option>
                {availableInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {formatCurrency(inv.amountDue, currency)} due
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Allocation Table */}
          {allocations.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {formData.customerId
                  ? availableInvoices.length > 0
                    ? 'Add invoices above, or leave blank for a prepayment'
                    : 'No open invoices for this customer — this will be a prepayment'
                  : 'Select a customer first'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Invoice</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Due</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-40">Apply</th>
                    <th className="py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {allocations.map((alloc) => (
                    <tr key={alloc.invoiceId}>
                      <td className="py-2 font-medium text-gray-900 dark:text-white">{alloc.invoiceNumber}</td>
                      <td className="py-2 text-right text-gray-500 dark:text-gray-400">{formatCurrency(alloc.totalAmount, currency)}</td>
                      <td className="py-2 text-right text-gray-500 dark:text-gray-400">{formatCurrency(alloc.amountDue, currency)}</td>
                      <td className="py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          max={alloc.amountDue}
                          step="0.01"
                          value={alloc.allocatedAmount}
                          onChange={(e) => handleAllocationChange(alloc.invoiceId, parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right text-sm font-mono"
                        />
                      </td>
                      <td className="py-2 text-center">
                        <button type="button" onClick={() => handleRemoveInvoice(alloc.invoiceId)} className="text-red-500 hover:text-red-700 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
                    <td colSpan={3} className="py-2 text-right text-gray-700 dark:text-gray-300">Total Applied:</td>
                    <td className="py-2 text-right text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(totalAllocated, currency)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Prepayment Notice */}
          {isPrePayment && formData.amount > 0 && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Prepayment: {formatCurrency(unappliedAmount, currency)} unapplied
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  This amount will remain as credit on the customer&apos;s account and can be allocated later.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Notes</h2>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            rows={3}
            placeholder="Add any notes about this payment..."
          />
        </div>

        {/* Summary & Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center text-xl font-bold">
            <span className="text-gray-900 dark:text-white">Total Payment</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(formData.amount, currency)}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href={`/${orgSlug}/payments`}>
            <button type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
              Cancel
            </button>
          </Link>
          <button
            type="submit"
            disabled={submitting || formData.amount <= 0}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Recording...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Record Payment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
