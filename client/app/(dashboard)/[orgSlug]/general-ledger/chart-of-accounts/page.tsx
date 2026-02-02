'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Tag,
  Globe
} from 'lucide-react';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/currency';

interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  accountSubType: string | null;
  description: string | null;
  isActive: boolean;
  balance: number;
  foreignBalance: number | null;
  currency: string;
  parentId: string | null;
  level: number;
  hasChildren: boolean;
  allowManualJournal: boolean;
  tags: string[];
  children?: ChartOfAccount[];
}

interface AccountNode {
  account: ChartOfAccount;
  isExpanded: boolean;
  depth: number;
}

export default function ChartOfAccountsPage() {
  const onboardingCheck = useOnboardingGuard();
  const { currency } = useOrganization();
  
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showInactive, setShowInactive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, [orgSlug]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts`);
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.data);
      } else {
        console.error('Failed to fetch accounts:', data.error);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical tree structure
  const buildAccountTree = (parentId: string | null = null): ChartOfAccount[] => {
    return accounts
      .filter(account => account.parentId === parentId)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(account => ({
        ...account,
        children: buildAccountTree(account.id)
      }));
  };

  // Flatten tree for display with hierarchy levels
  const flattenTree = (tree: ChartOfAccount[], depth = 0): AccountNode[] => {
    const result: AccountNode[] = [];
    
    tree.forEach(account => {
      // Apply filters
      const matchesSearch = !searchTerm || 
        account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'ALL' || account.accountType === filterType;
      const matchesActiveFilter = showInactive || account.isActive;

      if (matchesSearch && matchesType && matchesActiveFilter) {
        result.push({
          account,
          isExpanded: expandedNodes.has(account.id),
          depth
        });

        // Add children if expanded
        if (account.children && account.children.length > 0 && expandedNodes.has(account.id)) {
          result.push(...flattenTree(account.children, depth + 1));
        }
      }
    });

    return result;
  };

  const toggleExpand = (accountId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(accounts.filter(a => a.hasChildren).map(a => a.id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const accountTree = buildAccountTree();
  const displayNodes = flattenTree(accountTree);

  const accountTypes = ['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ASSET: 'bg-blue-100 text-blue-800',
      LIABILITY: 'bg-red-100 text-red-800',
      EQUITY: 'bg-purple-100 text-purple-800',
      REVENUE: 'bg-green-100 text-green-800',
      EXPENSE: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getBalanceClassName = (account: ChartOfAccount) => {
    const balance = Number(account.balance);
    if (balance === 0) return 'text-gray-600';
    
    // For Assets and Expenses, positive is debit (normal)
    if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
      return balance > 0 ? 'text-gray-900 font-semibold' : 'text-red-600';
    }
    
    // For Liabilities, Equity, Revenue, positive is credit (normal)
    return balance > 0 ? 'text-gray-900 font-semibold' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chart of accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-600 mt-1">Hierarchical financial account structure</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Account
        </button>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code or name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              {accountTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'ALL' ? 'All Types' : type}
                </option>
              ))}
            </select>
          </div>

          {/* Tree Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Collapse All
            </button>
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`px-3 py-2 text-sm border rounded-lg transition ${
                showInactive 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              aria-label={showInactive ? 'Showing inactive accounts' : 'Hiding inactive accounts'}
            >
              {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Hierarchical Accounts Tree Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code / Account Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance ({currency})
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Foreign Balance
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Controls
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayNodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="text-center">
                      <p className="text-lg font-medium">No accounts found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm ? 'Try adjusting your search or filters' : 'Get started by creating your first account'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayNodes.map(({ account, isExpanded, depth }) => (
                  <tr 
                    key={account.id} 
                    className={`hover:bg-gray-50 ${!account.isActive ? 'bg-gray-50 opacity-60' : ''} ${account.hasChildren ? 'font-medium' : ''}`}
                  >
                    {/* Code / Name with hierarchy */}
                    <td className="px-6 py-4">
                      <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
                        {account.hasChildren ? (
                          <button
                            onClick={() => toggleExpand(account.id)}
                            className="mr-2 p-1 hover:bg-gray-200 rounded transition"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-600" />
                            )}
                          </button>
                        ) : (
                          <span className="w-6 mr-2"></span>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm ${account.hasChildren ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {account.code}
                            </span>
                            <span className={account.hasChildren ? 'font-semibold text-gray-900' : 'text-gray-800'}>
                              {account.name}
                            </span>
                            {!account.isActive && (
                              <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                                Inactive
                              </span>
                            )}
                            {account.tags && account.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Tag className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">{account.tags.join(', ')}</span>
                              </div>
                            )}
                          </div>
                          {account.description && (
                            <div className="text-xs text-gray-500 mt-1">{account.description}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(account.accountType)}`}>
                        {account.accountType}
                      </span>
                      {account.accountSubType && (
                        <div className="text-xs text-gray-500 mt-1">{account.accountSubType}</div>
                      )}
                    </td>

                    {/* Currency */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {account.currency !== currency && (
                          <div title="Multi-currency account">
                            <Globe className="h-3 w-3 text-blue-500" />
                          </div>
                        )}
                        <span className={`text-sm font-mono ${account.currency !== currency ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                          {account.currency}
                        </span>
                      </div>
                    </td>

                    {/* Balance (Base Currency) */}
                    <td className={`px-6 py-4 text-right whitespace-nowrap ${getBalanceClassName(account)}`}>
                      {formatCurrency(Number(account.balance), currency)}
                    </td>

                    {/* Foreign Balance */}
                    <td className="px-6 py-4 text-right whitespace-nowrap text-sm">
                      {account.foreignBalance ? (
                        <span className="text-blue-700 font-medium">
                          {formatCurrency(Number(account.foreignBalance), account.currency)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Controls */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Manual Posting Indicator */}
                        {account.allowManualJournal ? (
                          <div title="Allows manual journal entries">
                            <Unlock className="h-4 w-4 text-green-600" />
                          </div>
                        ) : (
                          <div title="System-controlled account">
                            <Lock className="h-4 w-4 text-red-600" />
                          </div>
                        )}
                        
                        {/* Parent Account Indicator */}
                        {account.hasChildren && (
                          <span 
                            className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded"
                            title="Parent account - balance is sum of children"
                          >
                            Parent
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-800 transition p-1 hover:bg-blue-50 rounded"
                          aria-label="Edit account"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {!account.hasChildren && (
                          <button
                            className="text-red-600 hover:text-red-800 transition p-1 hover:bg-red-50 rounded"
                            aria-label="Delete account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {accountTypes.filter(t => t !== 'ALL').map(type => {
          const typeAccounts = accounts.filter(a => a.accountType === type && a.isActive);
          const totalBalance = typeAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
          
          return (
            <div key={type} className="bg-white rounded-lg shadow p-4">
              <div className={`text-xs font-semibold mb-1 ${getTypeColor(type)} inline-block px-2 py-1 rounded`}>
                {type}
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(totalBalance, currency)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {typeAccounts.length} accounts
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <AccountFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchAccounts();
          }}
          orgSlug={orgSlug}
        />
      )}
    </div>
  );
}

// Account Form Modal Component
function AccountFormModal({
  isOpen,
  onClose,
  onSuccess,
  orgSlug,
  account,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgSlug: string;
  account?: ChartOfAccount;
}) {
  const [formData, setFormData] = useState({
    code: account?.code || '',
    name: account?.name || '',
    accountType: account?.accountType || 'ASSET',
    accountSubType: account?.accountSubType || '',
    description: account?.description || '',
    isActive: account?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = account
        ? `/api/orgs/${orgSlug}/chart-of-accounts/${account.id}`
        : `/api/orgs/${orgSlug}/chart-of-accounts`;
      
      const method = account ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save account');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {account ? 'Edit Account' : 'Create Account'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Code *
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1000"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type *
              </label>
              <select
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
              >
                <option value="ASSET">Asset</option>
                <option value="LIABILITY">Liability</option>
                <option value="EQUITY">Equity</option>
                <option value="REVENUE">Revenue</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Name *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Cash"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category / Sub-Type
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Current Assets"
              value={formData.accountSubType}
              onChange={(e) => setFormData({ ...formData, accountSubType: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Account description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Account is active
            </label>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : account ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
