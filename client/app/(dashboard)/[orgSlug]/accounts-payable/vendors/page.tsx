'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import Loading from '@/components/ui/loading';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';

interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  contactPerson: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingCountry: string | null;
  paymentTerms: string;
  isActive: boolean;
  totalOwed: number;
  totalPaid: number;
  _count: { bills: number };
}

export default function VendorsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { currency } = useOrganization();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchVendors();
  }, [orgSlug]);

  useEffect(() => {
    filterVendors();
  }, [vendors, search, statusFilter]);

  async function fetchVendors() {
    try {
      setLoading(true);
      const response = await fetch(`/api/orgs/${orgSlug}/vendors`);
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const data = await response.json();
      setVendors(data.vendors);
    } catch (err) {
      setError('Failed to load vendors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function filterVendors() {
    let filtered = vendors;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (vendor) =>
          vendor.name.toLowerCase().includes(searchLower) ||
          vendor.email?.toLowerCase().includes(searchLower) ||
          vendor.contactPerson?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((vendor) =>
        statusFilter === 'active' ? vendor.isActive : !vendor.isActive
      );
    }

    setFilteredVendors(filtered);
  }

  function handleCreateVendor() {
    setEditingVendor(null);
    setIsModalOpen(true);
  }

  function handleEditVendor(vendor: Vendor) {
    setEditingVendor(vendor);
    setIsModalOpen(true);
  }

  function handleModalClose() {
    setIsModalOpen(false);
    setEditingVendor(null);
  }

  function handleVendorSaved() {
    setIsModalOpen(false);
    setEditingVendor(null);
    setSuccess(editingVendor ? 'Vendor updated successfully' : 'Vendor created successfully');
    fetchVendors();
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleDeleteVendor(vendor: Vendor) {
    if (!confirm(`Are you sure you want to delete ${vendor.name}?`)) return;

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/vendors/${vendor.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete vendor');
      }

      setSuccess('Vendor deleted successfully');
      fetchVendors();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  }

  const activeVendors = vendors.filter((v) => v.isActive).length;
  const totalOwed = vendors.reduce((sum, v) => sum + v.totalOwed, 0);
  const totalPaid = vendors.reduce((sum, v) => sum + v.totalPaid, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vendors</h1>
        <Button onClick={handleCreateVendor}>Create Vendor</Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeVendors}</p>
            <p className="text-xs text-gray-500">of {vendors.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Owed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalOwed, currency)}
            </p>
            <p className="text-xs text-gray-500">unpaid bills</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid, currency)}
            </p>
            <p className="text-xs text-gray-500">paid bills</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {vendors.reduce((sum, v) => sum + v._count.bills, 0)}
            </p>
            <p className="text-xs text-gray-500">across all vendors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search vendors by name, email, or contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Vendors</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Grid */}
      {filteredVendors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              {search || statusFilter !== 'all'
                ? 'No vendors found matching your criteria'
                : 'No vendors yet. Create your first vendor to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Link
                      href={`/${orgSlug}/accounts-payable/vendors/${vendor.id}`}
                      className="hover:underline"
                    >
                      <CardTitle className="text-lg">{vendor.name}</CardTitle>
                    </Link>
                    {vendor.contactPerson && (
                      <p className="text-sm text-gray-600 mt-1">
                        Contact: {vendor.contactPerson}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      vendor.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {vendor.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {vendor.email && (
                    <p className="text-gray-600">
                      <span className="font-medium">Email:</span> {vendor.email}
                    </p>
                  )}
                  {vendor.phone && (
                    <p className="text-gray-600">
                      <span className="font-medium">Phone:</span> {vendor.phone}
                    </p>
                  )}
                  {vendor.billingCity && vendor.billingState && (
                    <p className="text-gray-600">
                      <span className="font-medium">Location:</span>{' '}
                      {vendor.billingCity}, {vendor.billingState}
                    </p>
                  )}
                  <p className="text-gray-600">
                    <span className="font-medium">Payment Terms:</span>{' '}
                    {vendor.paymentTerms.replace('_', ' ')}
                  </p>
                  <div className="pt-2 mt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Owed:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(vendor.totalOwed, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-600">Bills:</span>
                      <span className="font-semibold">{vendor._count.bills}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditVendor(vendor)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDeleteVendor(vendor)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <VendorFormModal
          vendor={editingVendor}
          orgSlug={orgSlug}
          onClose={handleModalClose}
          onSaved={handleVendorSaved}
        />
      )}
    </div>
  );
}

interface VendorFormModalProps {
  vendor: Vendor | null;
  orgSlug: string;
  onClose: () => void;
  onSaved: () => void;
}

function VendorFormModal({ vendor, orgSlug, onClose, onSaved }: VendorFormModalProps) {
  const [formData, setFormData] = useState({
    name: vendor?.name || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    website: vendor?.website || '',
    taxId: vendor?.taxId || '',
    contactPerson: vendor?.contactPerson || '',
    contactEmail: vendor?.contactEmail || '',
    contactPhone: vendor?.contactPhone || '',
    billingAddress: vendor?.billingAddress || '',
    billingCity: vendor?.billingCity || '',
    billingState: vendor?.billingState || '',
    billingPostalCode: vendor?.billingPostalCode || '',
    billingCountry: vendor?.billingCountry || '',
    paymentTerms: vendor?.paymentTerms || 'NET_30',
    notes: vendor?.notes || '',
    isActive: vendor?.isActive ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = vendor
        ? `/api/orgs/${orgSlug}/vendors/${vendor.id}`
        : `/api/orgs/${orgSlug}/vendors`;
      const method = vendor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save vendor');
      }

      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={vendor ? 'Edit Vendor' : 'Create Vendor'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Vendor Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="taxId">Tax ID</Label>
            <Input
              id="taxId"
              value={formData.taxId}
              onChange={(e) => handleChange('taxId', e.target.value)}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Contact Person</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="contactPerson">Name</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => handleChange('contactPhone', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Billing Address</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="billingAddress">Street Address</Label>
              <Input
                id="billingAddress"
                value={formData.billingAddress}
                onChange={(e) => handleChange('billingAddress', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <Label htmlFor="billingCity">City</Label>
                <Input
                  id="billingCity"
                  value={formData.billingCity}
                  onChange={(e) => handleChange('billingCity', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="billingState">State</Label>
                <Input
                  id="billingState"
                  value={formData.billingState}
                  onChange={(e) => handleChange('billingState', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="billingPostalCode">ZIP</Label>
                <Input
                  id="billingPostalCode"
                  value={formData.billingPostalCode}
                  onChange={(e) => handleChange('billingPostalCode', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="billingCountry">Country</Label>
              <Input
                id="billingCountry"
                value={formData.billingCountry}
                onChange={(e) => handleChange('billingCountry', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <select
              id="paymentTerms"
              value={formData.paymentTerms}
              onChange={(e) => handleChange('paymentTerms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="DUE_ON_RECEIPT">Due on Receipt</option>
              <option value="NET_15">Net 15</option>
              <option value="NET_30">Net 30</option>
              <option value="NET_60">Net 60</option>
              <option value="NET_90">Net 90</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="rounded"
              />
              <span>Active</span>
            </label>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : vendor ? 'Update Vendor' : 'Create Vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
