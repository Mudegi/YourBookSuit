'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  routingNumber: string | null;
  currency: string;
  currentBalance: number;
  isActive: boolean;
  lastReconciledDate: string | null;
  lastReconciledBalance: number | null;
  account: Account;
}

interface Stats {
  totalAccounts: number;
  activeAccounts: number;
  totalBalance: number;
}

export default function BankAccountsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [stats, setStats] = useState<Stats>({ totalAccounts: 0, activeAccounts: 0, totalBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [chartOfAccounts, setChartOfAccounts] = useState<Account[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    accountId: '',
    bankName: '',
    accountNumber: '',
    accountType: 'CHECKING',
    routingNumber: '',
    currency: 'USD',
    isActive: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [accountsResponse, coaResponse] = await Promise.all([
        fetch(`/api/orgs/${orgSlug}/bank-accounts`),
        fetch(`/api/orgs/${orgSlug}/chart-of-accounts?type=ASSET`),
      ]);

      if (!accountsResponse.ok || !coaResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const accountsData = await accountsResponse.json();
      const coaData = await coaResponse.json();

      setBankAccounts(accountsData.bankAccounts);
      setStats(accountsData.stats);
      setChartOfAccounts(coaData.accounts || []);
    } catch (err) {
      setError('Failed to load bank accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      accountId: '',
      bankName: '',
      accountNumber: '',
      accountType: 'CHECKING',
      routingNumber: '',
      currency: 'USD',
      isActive: true,
    });
    setShowModal(true);
  }

  function openEditModal(account: BankAccount) {
    setIsEditing(true);
    setEditingId(account.id);
    setFormData({
      accountId: account.account.id,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      routingNumber: account.routingNumber || '',
      currency: account.currency,
      isActive: account.isActive,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const url = isEditing
        ? `/api/orgs/${orgSlug}/bank-accounts/${editingId}`
        : `/api/orgs/${orgSlug}/bank-accounts`;

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save bank account');
      }

      setSuccess(
        isEditing
          ? 'Bank account updated successfully'
          : 'Bank account created successfully'
      );
      setShowModal(false);
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string, bankName: string) {
    if (
      !confirm(
        `Are you sure you want to delete the bank account at ${bankName}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/bank-accounts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete bank account');
      }

      setSuccess('Bank account deleted successfully');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  }

  function getAccountTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      CHECKING: 'Checking',
      SAVINGS: 'Savings',
      MONEY_MARKET: 'Money Market',
      CREDIT_CARD: 'Credit Card',
      OTHER: 'Other',
    };
    return labels[type] || type;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bank Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your organization's bank accounts</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/banking/transfers`}>
            <Button variant="outline">Transfer Funds</Button>
          </Link>
          <Button onClick={openCreateModal}>+ Add Bank Account</Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600">Total Accounts</div>
            <div className="text-3xl font-bold mt-2">{stats.totalAccounts}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.activeAccounts} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600">Total Balance</div>
            <div className="text-3xl font-bold mt-2 text-blue-600">
              ${stats.totalBalance.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Across all accounts</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600">Quick Actions</div>
            <div className="mt-2 space-y-2">
              <Link
                href={`/${orgSlug}/banking/transfers`}
                className="block text-sm text-blue-600 hover:underline"
              >
                → Transfer Funds
              </Link>
              <Link
                href={`/${orgSlug}/banking/reconciliation`}
                className="block text-sm text-blue-600 hover:underline"
              >
                → Reconcile Accounts
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bankAccounts.map((account) => (
          <Card key={account.id} className={!account.isActive ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{account.bankName}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {getAccountTypeLabel(account.accountType)}
                  </p>
                </div>
                {!account.isActive && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    Inactive
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Account Number</p>
                  <p className="font-mono text-sm">
                    ****{account.accountNumber.slice(-4)}
                  </p>
                </div>

                {account.routingNumber && (
                  <div>
                    <p className="text-xs text-gray-600">Routing Number</p>
                    <p className="font-mono text-sm">{account.routingNumber}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-600">GL Account</p>
                  <Link
                    href={`/${orgSlug}/general-ledger/chart-of-accounts/${account.account.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {account.account.code} - {account.account.name}
                  </Link>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-600">Current Balance</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${account.currentBalance.toFixed(2)}
                  </p>
                </div>

                {account.lastReconciledDate && (
                  <div>
                    <p className="text-xs text-gray-600">Last Reconciled</p>
                    <p className="text-sm">
                      {new Date(account.lastReconciledDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-3">
                  <Link href={`/${orgSlug}/banking/accounts/${account.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => openEditModal(account)}
                    className="px-3"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(account.id, account.bankName)}
                    className="px-3 text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bankAccounts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">No bank accounts found</p>
            <Button onClick={openCreateModal}>+ Add Your First Bank Account</Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Edit Bank Account' : 'Add Bank Account'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="accountId">Chart of Accounts *</Label>
            <Select
              id="accountId"
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              required
              disabled={isEditing}
            >
              <option value="">Select GL Account...</option>
              {chartOfAccounts
                .filter((acc) => acc.code.startsWith('1') && !acc.code.startsWith('12'))
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
            </Select>
            <p className="text-xs text-gray-600 mt-1">
              Bank/Cash accounts only (excludes Accounts Receivable)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="Chase Bank"
                required
              />
            </div>

            <div>
              <Label htmlFor="accountType">Account Type *</Label>
              <Select
                id="accountType"
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                required
              >
                <option value="CHECKING">Checking</option>
                <option value="SAVINGS">Savings</option>
                <option value="MONEY_MARKET">Money Market</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                value={formData.accountNumber}
                onChange={(e) =>
                  setFormData({ ...formData, accountNumber: e.target.value })
                }
                placeholder="1234567890"
                required
              />
            </div>

            <div>
              <Label htmlFor="routingNumber">Routing Number</Label>
              <Input
                id="routingNumber"
                value={formData.routingNumber}
                onChange={(e) =>
                  setFormData({ ...formData, routingNumber: e.target.value })
                }
                placeholder="021000021"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="isActive">Status</Label>
              <Select
                id="isActive"
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.value === 'true' })
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? 'Update' : 'Create'} Bank Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
