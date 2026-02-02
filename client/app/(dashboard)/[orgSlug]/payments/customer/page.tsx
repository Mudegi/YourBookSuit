'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
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

interface InvoiceAllocation {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  amountDue: number;
  allocatedAmount: number;
}

export default function CustomerPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const preselectedCustomerId = searchParams.get('customerId');
  const preselectedInvoiceId = searchParams.get('invoiceId');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currency } = useOrganization();

  const [formData, setFormData] = useState({
    customerId: preselectedCustomerId || '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'CHECK' as 'CASH' | 'CHECK' | 'CARD' | 'ACH' | 'WIRE' | 'OTHER',
    bankAccountId: '',
    referenceNumber: '',
    notes: '',
  });

  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);

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

      if (!customersRes.ok || !accountsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const customersData = await customersRes.json();
      const accountsData = await accountsRes.json();

      setCustomers(customersData.customers || customersData.data || []);
      // Filter for ASSET accounts (bank/cash accounts)
      const allAccounts = accountsData.accounts || accountsData.data || [];
      setBankAccounts(
        allAccounts.filter(
          (acc: BankAccount) =>
            acc.code.startsWith('1') && !acc.code.startsWith('12')
        )
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
      // Fetch all invoices for customer (not just SENT/OVERDUE) then filter for unpaid
      const response = await fetch(
        `/api/orgs/${orgSlug}/invoices?customerId=${customerId}`
      );

      if (!response.ok) throw new Error('Failed to fetch invoices');

      const data = await response.json();
      const allInvoices = data.invoices || data.data || [];
      
      // Calculate amount paid and due for each invoice
      const invoicesWithAmounts = allInvoices.map((inv: any) => {
        const amountPaid = 0; // Will be calculated from payment allocations
        const amountDue = Number(inv.total || inv.totalAmount || 0) - amountPaid;
        
        return {
          ...inv,
          totalAmount: Number(inv.total || inv.totalAmount || 0),
          amountPaid,
          amountDue,
        };
      });
      
      // Filter for unpaid invoices (not DRAFT and not PAID)
      const unpaidInvoices = invoicesWithAmounts.filter(
        (inv: Invoice) => inv.status !== 'DRAFT' && inv.status !== 'PAID' && inv.amountDue > 0
      );
      
      setCustomerInvoices(unpaidInvoices);

      // Auto-select preselected invoice if provided
      if (preselectedInvoiceId) {
        const invoice = invoicesWithAmounts.find((inv: Invoice) => inv.id === preselectedInvoiceId);
        if (invoice && invoice.amountDue > 0) {
          handleAddInvoice(invoice);
        }
      }
    } catch (err) {
      console.error('Failed to fetch customer invoices:', err);
    }
  }

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddInvoice(invoice: Invoice) {
    // Check if already allocated
    if (allocations.some((a) => a.invoiceId === invoice.id)) return;

    const newAllocation: InvoiceAllocation = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      amountDue: invoice.amountDue,
      allocatedAmount: invoice.amountDue, // Default to full amount due
    };

    setAllocations([...allocations, newAllocation]);
    updatePaymentAmount([...allocations, newAllocation]);
  }

  function handleRemoveInvoice(invoiceId: string) {
    const newAllocations = allocations.filter((a) => a.invoiceId !== invoiceId);
    setAllocations(newAllocations);
    updatePaymentAmount(newAllocations);
  }

  function handleAllocationChange(invoiceId: string, amount: number) {
    const newAllocations = allocations.map((a) =>
      a.invoiceId === invoiceId ? { ...a, allocatedAmount: amount } : a
    );
    setAllocations(newAllocations);
    updatePaymentAmount(newAllocations);
  }

  function updatePaymentAmount(currentAllocations: InvoiceAllocation[]) {
    const total = currentAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    setFormData((prev) => ({ ...prev, amount: total }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.customerId) {
        throw new Error('Please select a customer');
      }

      if (!formData.bankAccountId) {
        throw new Error('Please select a bank account');
      }

      if (allocations.length === 0) {
        throw new Error('Please add at least one invoice allocation');
      }

      if (formData.amount <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      const payload = {
        customerId: formData.customerId,
        paymentDate: formData.paymentDate,
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.bankAccountId,
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" />
      </div>
    );
  }

  const availableInvoices = customerInvoices.filter(
    (inv) => !allocations.some((a) => a.invoiceId === inv.id)
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href={`/${orgSlug}/payments`}
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back to Payments
        </Link>
        <h1 className="text-3xl font-bold mt-2">Record Customer Payment</h1>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerId">Customer *</Label>
                <select
                  id="customerId"
                  value={formData.customerId}
                  onChange={(e) => handleChange('customerId', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="paymentDate">Payment Date *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => handleChange('paymentDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="bankAccountId">Deposit To *</Label>
                <select
                  id="bankAccountId"
                  value={formData.bankAccountId}
                  onChange={(e) => handleChange('bankAccountId', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select bank account...</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <select
                  id="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={(e) =>
                    handleChange('paymentMethod', e.target.value)
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CHECK">Check</option>
                  <option value="CARD">Credit/Debit Card</option>
                  <option value="ACH">ACH Transfer</option>
                  <option value="WIRE">Wire Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={(e) =>
                    handleChange('referenceNumber', e.target.value)
                  }
                  placeholder="Check number or transaction ID"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Allocations */}
        <Card>
          <CardHeader>
            <CardTitle>Apply to Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.customerId && availableInvoices.length > 0 && (
              <div>
                <Label>Add Invoice</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const invoice = customerInvoices.find(
                      (inv) => inv.id === e.target.value
                    );
                    if (invoice) handleAddInvoice(invoice);
                    e.target.value = '';
                  }}
                >
                  <option value="">Select an invoice...</option>
                  {availableInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} - {formatCurrency(invoice.amountDue, currency)} due
                    </option>
                  ))}
                </select>
              </div>
            )}

            {allocations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {formData.customerId
                  ? 'No unpaid invoices found for this customer. Add invoices above.'
                  : 'Select a customer to see their unpaid invoices'}
              </p>
            ) : (
              <div className="space-y-3">
                {allocations.map((allocation) => (
                  <div
                    key={allocation.invoiceId}
                    className="p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{allocation.invoiceNumber}</p>
                        <p className="text-sm text-gray-600">
                          Total: {formatCurrency(allocation.totalAmount, currency)} | Due: {formatCurrency(allocation.amountDue, currency)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveInvoice(allocation.invoiceId)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div>
                      <Label>Payment Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        max={allocation.amountDue}
                        step="0.01"
                        value={allocation.allocatedAmount}
                        onChange={(e) =>
                          handleAllocationChange(
                            allocation.invoiceId,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Add any notes about this payment..."
            />
          </CardContent>
        </Card>

        {/* Total */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between text-xl font-bold">
              <span>Total Payment:</span>
              <span className="text-green-600">{formatCurrency(formData.amount, currency)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href={`/${orgSlug}/payments`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting || allocations.length === 0}>
            {submitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
