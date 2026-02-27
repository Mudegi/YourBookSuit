'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, Mail, Phone, Building2 } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useBranch } from '@/hooks/useBranch';
import { formatCurrency } from '@/lib/utils';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  customerNumber?: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  paymentTerms?: number;
  totalOwed: number;
  _count: {
    invoices: number;
  };
}

export default function CustomersPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();
  const { branchId } = useBranch();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [orgSlug, filterActive, branchId]);

  const fetchCustomers = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filterActive !== 'ALL') queryParams.append('isActive', filterActive);
      if (searchTerm) queryParams.append('search', searchTerm);
      if (branchId) queryParams.append('branchId', branchId);

      const response = await fetch(`/api/orgs/${orgSlug}/customers?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/customers/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchCustomers();
      } else {
        alert(data.error || 'Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    }
  };

  const handleSearch = () => {
    fetchCustomers();
  };

  const filteredCustomers = customers.filter((customer) => {
    const displayName = (customer.name || `${customer.firstName} ${customer.lastName}`).trim();
    const matchesSearch =
      displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer relationships</p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowCreateModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Customer
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* Active Filter */}
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
            >
              <option value="ALL">All Customers</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">No customers found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Create your first customer
            </button>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
            >
              {/* Customer Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {(customer.name || `${customer.firstName} ${customer.lastName}`).trim()}
                  </h3>
                  {customer.companyName && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Building2 className="h-4 w-4 mr-1" />
                      {customer.companyName}
                    </div>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    customer.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {customer.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {customer.email}
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {customer.phone}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Total Owed</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(customer.totalOwed, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Invoices</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {customer._count.invoices}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/${orgSlug}/accounts-receivable/customers/${customer.id}`}
                  className="flex-1 px-3 py-2 text-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                >
                  View Details
                </Link>
                <button
                  onClick={() => {
                    setEditingCustomer(customer);
                    setShowCreateModal(true);
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(customer.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Customers</div>
          <div className="text-3xl font-bold text-gray-900">{customers.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Active Customers</div>
          <div className="text-3xl font-bold text-green-600">
            {customers.filter((c) => c.isActive).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Outstanding</div>
          <div className="text-3xl font-bold text-orange-600">
            {formatCurrency(customers.reduce((sum, c) => sum + c.totalOwed, 0), currency)}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CustomerFormModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCustomer(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingCustomer(null);
            fetchCustomers();
          }}
          orgSlug={orgSlug}
          customer={editingCustomer}
        />
      )}
    </div>
  );
}

// Customer Form Modal Component
function CustomerFormModal({
  isOpen,
  onClose,
  onSuccess,
  orgSlug,
  customer,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgSlug: string;
  customer?: Customer | null;
}) {
  const [formData, setFormData] = useState({
    firstName: customer?.firstName || '',
    lastName: customer?.lastName || '',
    companyName: customer?.companyName || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    paymentTerms: (customer?.paymentTerms ?? 30).toString(),
    isActive: customer?.isActive ?? true,
    region: '',
    taxCategory: 'STANDARD' as 'STANDARD' | 'ZERO_RATED' | 'EXEMPT' | 'NON_TAXABLE',
    defaultRevenueAccountId: '',
    openingBalance: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revenueAccounts, setRevenueAccounts] = useState<Array<{ id: string; code: string; name: string }>>([]);

  useEffect(() => {
    fetchRevenueAccounts();
  }, []);

  useEffect(() => {
    setFormData({
      firstName: customer?.firstName || '',
      lastName: customer?.lastName || '',
      companyName: customer?.companyName || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      paymentTerms: (customer?.paymentTerms ?? 30).toString(),
      isActive: customer?.isActive ?? true,
      region: '',
      taxCategory: 'STANDARD',
      defaultRevenueAccountId: '',
      openingBalance: '',
    });
  }, [customer]);

  const fetchRevenueAccounts = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts`);
      const data = await response.json();
      if (data.success) {
        const revenue = data.data.filter(
          (acc: any) => acc.accountType === 'REVENUE' && acc.isActive
        );
        setRevenueAccounts(revenue);
      }
    } catch (err) {
      console.error('Error fetching revenue accounts:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = customer
        ? `/api/orgs/${orgSlug}/customers/${customer.id}`
        : `/api/orgs/${orgSlug}/customers`;

      const method = customer ? 'PUT' : 'POST';

      const payload: Record<string, any> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        paymentTerms: Number(formData.paymentTerms),
        isActive: formData.isActive,
      };

      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.companyName.trim()) payload.companyName = formData.companyName.trim();
      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.region.trim()) payload.region = formData.region.trim();
      if (formData.taxCategory) payload.taxCategory = formData.taxCategory;
      if (formData.defaultRevenueAccountId) payload.defaultRevenueAccountId = formData.defaultRevenueAccountId;
      if (formData.openingBalance && !customer) {
        const obValue = parseFloat(formData.openingBalance);
        if (!isNaN(obValue) && obValue > 0) {
          payload.openingBalance = obValue;
        }
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.message || data.error || 'Failed to save customer';
        console.error('Customer creation error:', data);
        throw new Error(errorMsg);
      }

      onSuccess();
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {customer ? 'Edit Customer' : 'New Customer'}
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
                First Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Jane"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Acme Corp"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="customer@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region/Country
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Country name"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              >
                <option value="0">Due on Receipt</option>
                <option value="15">Net 15</option>
                <option value="30">Net 30</option>
                <option value="60">Net 60</option>
                <option value="90">Net 90</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Category
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.taxCategory}
                onChange={(e) => setFormData({ ...formData, taxCategory: e.target.value as any })}
              >
                <option value="STANDARD">Standard VAT (18%)</option>
                <option value="ZERO_RATED">Zero-Rated (0%)</option>
                <option value="EXEMPT">Exempt</option>
                <option value="NON_TAXABLE">Non-Taxable</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Revenue Account
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.defaultRevenueAccountId}
                onChange={(e) => setFormData({ ...formData, defaultRevenueAccountId: e.target.value })}
              >
                <option value="">-- Select Revenue Account (Optional) --</option>
                {revenueAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {!customer && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Balance (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  If this customer has an outstanding balance from a previous system, enter it here. 
                  A migration journal entry will be created automatically.
                </p>
              </div>
            )}

            <div className="flex items-center pt-4 col-span-2">
              <input
                type="checkbox"
                id="isActive"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Customer is active
              </label>
            </div>
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
              {loading ? 'Saving...' : customer ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
