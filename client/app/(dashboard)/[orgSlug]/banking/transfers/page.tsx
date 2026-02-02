'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Account {
  id: string;
  code: string;
  name: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  currentBalance: number;
  isActive: boolean;
  account: Account;
}

export default function BankTransferPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    transferDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  const [fromAccount, setFromAccount] = useState<BankAccount | null>(null);
  const [toAccount, setToAccount] = useState<BankAccount | null>(null);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    if (formData.fromAccountId) {
      const account = bankAccounts.find((a) => a.id === formData.fromAccountId);
      setFromAccount(account || null);
    } else {
      setFromAccount(null);
    }
  }, [formData.fromAccountId, bankAccounts]);

  useEffect(() => {
    if (formData.toAccountId) {
      const account = bankAccounts.find((a) => a.id === formData.toAccountId);
      setToAccount(account || null);
    } else {
      setToAccount(null);
    }
  }, [formData.toAccountId, bankAccounts]);

  async function fetchBankAccounts() {
    try {
      setLoading(true);
      const response = await fetch(`/api/orgs/${orgSlug}/bank-accounts`);
      if (!response.ok) throw new Error('Failed to fetch bank accounts');
      const data = await response.json();
      setBankAccounts(data.bankAccounts.filter((a: BankAccount) => a.isActive));
    } catch (err) {
      setError('Failed to load bank accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.fromAccountId) {
      setError('Please select a source account');
      return;
    }

    if (!formData.toAccountId) {
      setError('Please select a destination account');
      return;
    }

    if (formData.fromAccountId === formData.toAccountId) {
      setError('Source and destination accounts must be different');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid transfer amount');
      return;
    }

    if (fromAccount && amount > fromAccount.currentBalance) {
      setError(
        `Insufficient funds. Available balance: $${fromAccount.currentBalance.toFixed(2)}`
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`/api/orgs/${orgSlug}/bank-transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
          amount,
          transferDate: formData.transferDate,
          reference: formData.reference || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create transfer');
      }

      const data = await response.json();
      router.push(`/${orgSlug}/banking/accounts`);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/${orgSlug}/banking/accounts`}
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back to Bank Accounts
        </Link>
        <h1 className="text-3xl font-bold mt-2">Transfer Funds</h1>
        <p className="text-gray-600 mt-1">
          Transfer money between your bank accounts
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* From Account */}
            <div>
              <Label htmlFor="fromAccountId">From Account *</Label>
              <Select
                id="fromAccountId"
                value={formData.fromAccountId}
                onChange={(e) =>
                  setFormData({ ...formData, fromAccountId: e.target.value })
                }
                required
              >
                <option value="">Select source account...</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} - ****{account.accountNumber.slice(-4)} ($
                    {account.currentBalance.toFixed(2)})
                  </option>
                ))}
              </Select>
              {fromAccount && (
                <div className="mt-2 p-3 bg-blue-50 rounded">
                  <p className="text-sm text-gray-700">
                    <strong>Available Balance:</strong> $
                    {fromAccount.currentBalance.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {fromAccount.account.code} - {fromAccount.account.name}
                  </p>
                </div>
              )}
            </div>

            {/* To Account */}
            <div>
              <Label htmlFor="toAccountId">To Account *</Label>
              <Select
                id="toAccountId"
                value={formData.toAccountId}
                onChange={(e) =>
                  setFormData({ ...formData, toAccountId: e.target.value })
                }
                required
              >
                <option value="">Select destination account...</option>
                {bankAccounts
                  .filter((a) => a.id !== formData.fromAccountId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} - ****{account.accountNumber.slice(-4)} ($
                      {account.currentBalance.toFixed(2)})
                    </option>
                  ))}
              </Select>
              {toAccount && (
                <div className="mt-2 p-3 bg-green-50 rounded">
                  <p className="text-sm text-gray-700">
                    <strong>Current Balance:</strong> $
                    {toAccount.currentBalance.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {toAccount.account.code} - {toAccount.account.name}
                  </p>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="amount">Transfer Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
              {fromAccount && formData.amount && (
                <p className="text-sm text-gray-600 mt-1">
                  Remaining balance after transfer: $
                  {(fromAccount.currentBalance - parseFloat(formData.amount || '0')).toFixed(
                    2
                  )}
                </p>
              )}
            </div>

            {/* Transfer Date */}
            <div>
              <Label htmlFor="transferDate">Transfer Date *</Label>
              <Input
                id="transferDate"
                type="date"
                value={formData.transferDate}
                onChange={(e) =>
                  setFormData({ ...formData, transferDate: e.target.value })
                }
                required
              />
            </div>

            {/* Reference */}
            <div>
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Optional reference number"
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this transfer"
                rows={3}
              />
            </div>

            {/* Summary */}
            {fromAccount && toAccount && formData.amount && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <h3 className="font-semibold text-gray-900">Transfer Summary</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-600">From:</span>{' '}
                    <span className="font-medium">
                      {fromAccount.bankName} (****{fromAccount.accountNumber.slice(-4)})
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-600">To:</span>{' '}
                    <span className="font-medium">
                      {toAccount.bankName} (****{toAccount.accountNumber.slice(-4)})
                    </span>
                  </p>
                  <p className="pt-2 border-t">
                    <span className="text-gray-600">Transfer Amount:</span>{' '}
                    <span className="font-bold text-blue-600 text-lg">
                      ${parseFloat(formData.amount).toFixed(2)}
                    </span>
                  </p>
                </div>
                <p className="text-xs text-gray-500 pt-2">
                  This will create a balanced GL transaction: DR: {toAccount.account.code},
                  CR: {fromAccount.account.code}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Link href={`/${orgSlug}/banking/accounts`}>
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Processing...' : 'Complete Transfer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
