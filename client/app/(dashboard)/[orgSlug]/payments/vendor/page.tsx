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

interface Vendor {
  id: string;
  name: string;
}

interface Bill {
  id: string;
  billNumber: string;
  billDate: string;
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

interface BillAllocation {
  billId: string;
  billNumber: string;
  totalAmount: number;
  amountDue: number;
  allocatedAmount: number;
}

export default function VendorPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const preselectedVendorId = searchParams.get('vendorId');
  const preselectedBillId = searchParams.get('billId');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [vendorBills, setVendorBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currency } = useOrganization();

  const [formData, setFormData] = useState({
    vendorId: preselectedVendorId || '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'CHECK' as 'CASH' | 'CHECK' | 'CARD' | 'ACH' | 'WIRE' | 'OTHER',
    bankAccountId: '',
    referenceNumber: '',
    notes: '',
  });

  const [allocations, setAllocations] = useState<BillAllocation[]>([]);

  useEffect(() => {
    fetchData();
  }, [orgSlug]);

  useEffect(() => {
    if (formData.vendorId) {
      fetchVendorBills(formData.vendorId);
    } else {
      setVendorBills([]);
      setAllocations([]);
    }
  }, [formData.vendorId]);

  async function fetchData() {
    try {
      setLoading(true);
      const [vendorsRes, accountsRes] = await Promise.all([
        fetch(`/api/orgs/${orgSlug}/vendors?isActive=true`),
        fetch(`/api/orgs/${orgSlug}/chart-of-accounts`),
      ]);

      if (!vendorsRes.ok || !accountsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const vendorsData = await vendorsRes.json();
      const accountsData = await accountsRes.json();

      setVendors(vendorsData.vendors || vendorsData.data || []);
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

  async function fetchVendorBills(vendorId: string) {
    try {
      // Fetch all bills for vendor (not just SENT/OVERDUE) then filter for unpaid
      const response = await fetch(
        `/api/orgs/${orgSlug}/bills?vendorId=${vendorId}`
      );

      if (!response.ok) throw new Error('Failed to fetch bills');

      const data = await response.json();
      const allBills = data.bills || data.data || [];
      
      // Calculate amount paid and due for each bill
      const billsWithAmounts = allBills.map((bill: any) => {
        const amountPaid = 0; // Will be calculated from payment allocations
        const amountDue = Number(bill.totalAmount || 0) - amountPaid;
        
        return {
          ...bill,
          totalAmount: Number(bill.totalAmount || 0),
          amountPaid,
          amountDue,
        };
      });
      
      // Filter for unpaid bills (not DRAFT and not PAID)
      const unpaidBills = billsWithAmounts.filter(
        (bill: Bill) => bill.status !== 'DRAFT' && bill.status !== 'PAID' && bill.amountDue > 0
      );
      
      setVendorBills(unpaidBills);

      // Auto-select preselected bill if provided
      if (preselectedBillId) {
        const bill = billsWithAmounts.find((b: Bill) => b.id === preselectedBillId);
        if (bill && bill.amountDue > 0) {
          handleAddBill(bill);
        }
      }
    } catch (err) {
      console.error('Failed to fetch vendor bills:', err);
    }
  }

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddBill(bill: Bill) {
    // Check if already allocated
    if (allocations.some((a) => a.billId === bill.id)) return;

    const newAllocation: BillAllocation = {
      billId: bill.id,
      billNumber: bill.billNumber,
      totalAmount: bill.totalAmount,
      amountDue: bill.amountDue,
      allocatedAmount: bill.amountDue, // Default to full amount due
    };

    setAllocations([...allocations, newAllocation]);
    updatePaymentAmount([...allocations, newAllocation]);
  }

  function handleRemoveBill(billId: string) {
    const newAllocations = allocations.filter((a) => a.billId !== billId);
    setAllocations(newAllocations);
    updatePaymentAmount(newAllocations);
  }

  function handleAllocationChange(billId: string, amount: number) {
    const newAllocations = allocations.map((a) =>
      a.billId === billId ? { ...a, allocatedAmount: amount } : a
    );
    setAllocations(newAllocations);
    updatePaymentAmount(newAllocations);
  }

  function updatePaymentAmount(currentAllocations: BillAllocation[]) {
    const total = currentAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    setFormData((prev) => ({ ...prev, amount: total }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.vendorId) {
        throw new Error('Please select a vendor');
      }

      if (!formData.bankAccountId) {
        throw new Error('Please select a bank account');
      }

      if (allocations.length === 0) {
        throw new Error('Please add at least one bill allocation');
      }

      if (formData.amount <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      const payload = {
        vendorId: formData.vendorId,
        paymentDate: formData.paymentDate,
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.bankAccountId,
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
        billAllocations: allocations.map((a) => ({
          billId: a.billId,
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

  const availableBills = vendorBills.filter(
    (bill) => !allocations.some((a) => a.billId === bill.id)
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
        <h1 className="text-3xl font-bold mt-2">Record Vendor Payment</h1>
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
                <Label htmlFor="vendorId">Vendor *</Label>
                <select
                  id="vendorId"
                  value={formData.vendorId}
                  onChange={(e) => handleChange('vendorId', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select vendor...</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
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
                <Label htmlFor="bankAccountId">Pay From *</Label>
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

        {/* Bill Allocations */}
        <Card>
          <CardHeader>
            <CardTitle>Apply to Bills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.vendorId && availableBills.length > 0 && (
              <div>
                <Label>Add Bill</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const bill = vendorBills.find(
                      (b) => b.id === e.target.value
                    );
                    if (bill) handleAddBill(bill);
                    e.target.value = '';
                  }}
                >
                  <option value="">Select a bill...</option>
                  {availableBills.map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.billNumber} - {formatCurrency(bill.amountDue, currency)} due
                    </option>
                  ))}
                </select>
              </div>
            )}

            {allocations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {formData.vendorId
                  ? 'No unpaid bills found for this vendor. Add bills above.'
                  : 'Select a vendor to see their unpaid bills'}
              </p>
            ) : (
              <div className="space-y-3">
                {allocations.map((allocation) => (
                  <div
                    key={allocation.billId}
                    className="p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{allocation.billNumber}</p>
                        <p className="text-sm text-gray-600">
                          Total: {formatCurrency(allocation.totalAmount, currency)} | Due: {formatCurrency(allocation.amountDue, currency)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveBill(allocation.billId)}
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
                            allocation.billId,
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
              <span className="text-red-600">{formatCurrency(formData.amount, currency)}</span>
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
