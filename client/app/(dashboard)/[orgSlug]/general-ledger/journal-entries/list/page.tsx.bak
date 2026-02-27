'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Eye, 
  RotateCcw, 
  Filter, 
  Search, 
  Download, 
  CheckSquare, 
  AlertTriangle,
  Calendar,
  User,
  Building,
  DollarSign,
  Paperclip,
  Archive
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface JournalEntryFilters {
  accountingPeriod?: {
    startDate: string;
    endDate: string;
  };
  branchId?: string;
  transactionType?: string;
  status?: string;
  amountRange?: {
    min: number;
    max: number;
  };
  createdBy?: string;
  search?: string;
}

interface JournalEntry {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  transactionType: string;
  description: string;
  status: string;
  notes?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  ledgerEntries: Array<{
    id: string;
    entryType: string;
    amount: number;
    currency: string;
    account: {
      id: string;
      code: string;
      name: string;
      accountType: string;
    };
  }>;
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
  metadata: {
    reference: string;
    isBalanced: boolean;
    foreignAmount?: number;
    foreignCurrency?: string;
    baseCurrencyEquivalent: number;
    baseCurrency: string;
    complianceFlags?: Record<string, any>;
    auditTrail: {
      lastModified: string;
      lastModifiedBy: string;
      version: number;
    };
  };
}

interface Branches {
  id: string;
  name: string;
  code: string;
}

interface Users {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function JournalEntriesListPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { organization, currency } = useOrganization();

  // State Management
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [branches, setBranches] = useState<Branches[]>([]);
  const [users, setUsers] = useState<Users[]>([]);

  // Filter State
  const [filters, setFilters] = useState<JournalEntryFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchJournalEntries();
    fetchBranches();
    fetchUsers();
  }, [orgSlug, filters, pagination.page]);

  const fetchJournalEntries = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // Add filters to query params
      if (filters.accountingPeriod?.startDate) queryParams.append('startDate', filters.accountingPeriod.startDate);
      if (filters.accountingPeriod?.endDate) queryParams.append('endDate', filters.accountingPeriod.endDate);
      if (filters.branchId) queryParams.append('branchId', filters.branchId);
      if (filters.transactionType) queryParams.append('transactionType', filters.transactionType);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.createdBy) queryParams.append('createdBy', filters.createdBy);
      if (filters.amountRange?.min) queryParams.append('minAmount', filters.amountRange.min.toString());
      if (filters.amountRange?.max) queryParams.append('maxAmount', filters.amountRange.max.toString());
      if (searchQuery) queryParams.append('search', searchQuery);

      const response = await fetch(`/api/orgs/${orgSlug}/journal-entries?${queryParams}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setEntries(data.entries);
        setPagination(prev => ({
          ...prev,
          total: data.total,
          pages: Math.ceil(data.total / prev.limit),
        }));
      } else {
        console.error('API returned error:', data);
      }
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/branches`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setBranches(data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/users`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleReverseEntry = async (entryId: string) => {
    const reason = prompt('Please provide a reason for reversing this entry:');
    if (!reason) return;

    if (!confirm(`Are you sure you want to reverse this entry? This will create an offsetting entry to maintain the audit trail.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/journal-entries/${entryId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();
      if (data.success) {
        fetchJournalEntries();
        alert('Entry reversed successfully');
      } else {
        alert(data.error || 'Failed to reverse entry');
      }
    } catch (error) {
      console.error('Error reversing entry:', error);
      alert('Failed to reverse entry');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedEntries.size === 0) return;

    if (!confirm(`Are you sure you want to approve ${selectedEntries.size} entries? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/journal-entries/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: Array.from(selectedEntries) }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedEntries(new Set());
        fetchJournalEntries();
        alert(`Successfully approved ${data.successful.length} entries. ${data.failed.length} failed.`);
      } else {
        alert(data.error || 'Failed to approve entries');
      }
    } catch (error) {
      console.error('Error approving entries:', error);
      alert('Failed to approve entries');
    }
  };

  const handleExportToExcel = async () => {
    try {
      const queryParams = new URLSearchParams({ format: 'excel' });

      // Add filters to query params
      if (filters.accountingPeriod?.startDate) queryParams.append('startDate', filters.accountingPeriod.startDate);
      if (filters.accountingPeriod?.endDate) queryParams.append('endDate', filters.accountingPeriod.endDate);
      if (filters.branchId) queryParams.append('branchId', filters.branchId);
      if (filters.transactionType) queryParams.append('transactionType', filters.transactionType);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.createdBy) queryParams.append('createdBy', filters.createdBy);
      if (filters.amountRange?.min) queryParams.append('minAmount', filters.amountRange.min.toString());
      if (filters.amountRange?.max) queryParams.append('maxAmount', filters.amountRange.max.toString());
      if (searchQuery) queryParams.append('search', searchQuery);

      const response = await fetch(`/api/orgs/${orgSlug}/journal-entries/export?${queryParams}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `journal-entries-${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting entries:', error);
      alert('Failed to export entries');
    }
  };

  const calculateTotalAmount = (entry: JournalEntry) => {
    return entry.ledgerEntries
      .filter(e => e.entryType === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const toggleEntrySelection = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const selectAllEntries = () => {
    if (selectedEntries.size === entries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(entries.map(e => e.id)));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'POSTED': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'VOIDED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'JOURNAL_ENTRY': return 'bg-blue-100 text-blue-800';
      case 'INVOICE': return 'bg-purple-100 text-purple-800';
      case 'BILL': return 'bg-orange-100 text-orange-800';
      case 'PAYMENT': return 'bg-green-100 text-green-800';
      case 'DEPRECIATION': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading journal entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-gray-600 mt-1">Complete audit trail of all financial transactions</p>
          {organization && (
            <p className="text-sm text-gray-500 mt-1">
              Base Currency: {organization.baseCurrency} • Country: {organization.homeCountry}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <Link
            href={`/${orgSlug}/general-ledger/journal-entries`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Entry
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search journal entries by reference, description, or notes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchJournalEntries()}
            />
          </div>
          <button
            onClick={fetchJournalEntries}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Accounting Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Accounting Period
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.accountingPeriod?.startDate || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    accountingPeriod: {
                      ...prev.accountingPeriod,
                      startDate: e.target.value,
                      endDate: prev.accountingPeriod?.endDate || '',
                    }
                  }))}
                />
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.accountingPeriod?.endDate || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    accountingPeriod: {
                      ...prev.accountingPeriod,
                      startDate: prev.accountingPeriod?.startDate || '',
                      endDate: e.target.value,
                    }
                  }))}
                />
              </div>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building className="h-4 w-4 inline mr-1" />
                Branch
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.branchId || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value }))}
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} - {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source/Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.transactionType || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, transactionType: e.target.value }))}
              >
                <option value="">All Types</option>
                <option value="JOURNAL_ENTRY">Manual Entry</option>
                <option value="INVOICE">Sales Invoice</option>
                <option value="BILL">Purchase Bill</option>
                <option value="PAYMENT">Payment</option>
                <option value="RECEIPT">Receipt</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="DEPRECIATION">Depreciation</option>
                <option value="INVENTORY_ADJUSTMENT">Inventory Adjustment</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="POSTED">Posted</option>
                <option value="VOIDED">Voided</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Created By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Created By
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.createdBy || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, createdBy: e.target.value }))}
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Amount Range
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Min Amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.amountRange?.min || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    amountRange: {
                      ...prev.amountRange,
                      min: parseFloat(e.target.value) || 0,
                      max: prev.amountRange?.max || 0,
                    }
                  }))}
                />
                <input
                  type="number"
                  placeholder="Max Amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.amountRange?.max || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    amountRange: {
                      ...prev.amountRange,
                      min: prev.amountRange?.min || 0,
                      max: parseFloat(e.target.value) || 0,
                    }
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => {
                setFilters({});
                setSearchQuery('');
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              Clear All Filters
            </button>
            <button
              onClick={fetchJournalEntries}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedEntries.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-blue-800 font-medium">
                {selectedEntries.size} entries selected
              </span>
              <button
                onClick={handleBulkApprove}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <CheckSquare className="h-4 w-4" />
                Bulk Approve
              </button>
            </div>
            <button
              onClick={() => setSelectedEntries(new Set())}
              className="text-blue-600 hover:text-blue-800"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Journal Entries List */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No journal entries found</p>
            <Link
              href={`/${orgSlug}/general-ledger/journal-entries`}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Create your first journal entry
            </Link>
          </div>
        ) : (
          <>
            {/* Table Header with Select All */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedEntries.size === entries.length}
                      onChange={selectAllEntries}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Select All ({entries.length} entries)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Journal Entries */}
            {entries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-lg shadow">
                {/* Entry Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={() => toggleEntrySelection(entry.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {entry.metadata.reference}
                          </h3>
                          
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(entry.status)}`}>
                            {entry.status}
                          </span>
                          
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(entry.transactionType)}`}>
                            {entry.transactionType.replace('_', ' ')}
                          </span>
                          
                          {!entry.metadata.isBalanced && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              UNBALANCED
                            </span>
                          )}
                          
                          {entry.attachments.length > 0 && (
                            <span className="text-gray-500" title={`${entry.attachments.length} attachments`}>
                              <Paperclip className="h-4 w-4" />
                            </span>
                          )}

                          {entry.metadata.complianceFlags?.vatInclusive && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              VAT
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-600 mb-2">{entry.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>
                            Date: {new Date(entry.transactionDate).toLocaleDateString()}
                          </span>
                          <span>
                            Created: {entry.createdBy.firstName} {entry.createdBy.lastName}
                          </span>
                          {entry.approvedBy && (
                            <span>
                              Approved: {entry.approvedBy.firstName} {entry.approvedBy.lastName}
                            </span>
                          )}
                          {entry.branch && (
                            <span>
                              Branch: {entry.branch.code}
                            </span>
                          )}
                          <span className="font-semibold">
                            Amount: {formatCurrency(entry.metadata.baseCurrencyEquivalent, entry.metadata.baseCurrency)}
                          </span>
                          {entry.metadata.foreignCurrency && (
                            <span className="text-blue-600">
                              Foreign: {formatCurrency(entry.metadata.foreignAmount || 0, entry.metadata.foreignCurrency)}
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-400">
                          Last Modified: {formatDateTime(entry.metadata.auditTrail.lastModified)} by {entry.metadata.auditTrail.lastModifiedBy}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${orgSlug}/general-ledger/journal-entries/${entry.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      
                      {entry.status === 'POSTED' && (
                        <button
                          onClick={() => handleReverseEntry(entry.id)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                          title="Reverse Entry"
                        >
                          <RotateCcw className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ledger Entries */}
                <div className="p-6">
                  <table className="w-full">
                    <thead className="text-sm text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="text-left pb-2">Account</th>
                        <th className="text-right pb-2">Debit</th>
                        <th className="text-right pb-2">Credit</th>
                        <th className="text-right pb-2">Currency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {entry.ledgerEntries.map((ledgerEntry) => (
                        <tr key={ledgerEntry.id}>
                          <td className="py-2">
                            <span className="font-mono text-sm text-gray-500 mr-2">
                              {ledgerEntry.account.code}
                            </span>
                            <span className="text-gray-900">{ledgerEntry.account.name}</span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({ledgerEntry.account.accountType})
                            </span>
                          </td>
                          <td className="py-2 text-right text-gray-900">
                            {ledgerEntry.entryType === 'DEBIT' ? 
                              formatCurrency(ledgerEntry.amount, ledgerEntry.currency) : 
                              '-'
                            }
                          </td>
                          <td className="py-2 text-right text-gray-900">
                            {ledgerEntry.entryType === 'CREDIT' ? 
                              formatCurrency(ledgerEntry.amount, ledgerEntry.currency) : 
                              '-'
                            }
                          </td>
                          <td className="py-2 text-right text-gray-500 text-sm">
                            {ledgerEntry.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Pagination */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <span className="px-3 py-2 text-sm">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
