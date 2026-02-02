'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Trash2, Star, Check } from 'lucide-react';

interface PaymentTerm {
  id: string;
  code: string;
  name: string;
  description: string | null;
  daysUntilDue: number;
  discountPercentage: number | null;
  discountDays: number | null;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
}

export default function PaymentTermsSettings() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [terms, setTerms] = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    daysUntilDue: 30,
    discountPercentage: '',
    discountDays: '',
    isDefault: false,
  });

  useEffect(() => {
    fetchTerms();
  }, [orgSlug]);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orgs/${orgSlug}/payment-terms?includeInactive=true`);
      const result = await response.json();

      if (result.success) {
        setTerms(result.data);
      }
    } catch (error) {
      console.error('Error fetching payment terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        discountPercentage: formData.discountPercentage ? parseFloat(formData.discountPercentage) : null,
        discountDays: formData.discountDays ? parseInt(formData.discountDays) : null,
      };

      const url = editingTerm
        ? `/api/orgs/${orgSlug}/payment-terms/${editingTerm.id}`
        : `/api/orgs/${orgSlug}/payment-terms`;
      
      const method = editingTerm ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setShowForm(false);
        setEditingTerm(null);
        resetForm();
        fetchTerms();
      }
    } catch (error) {
      console.error('Error saving payment term:', error);
    }
  };

  const handleEdit = (term: PaymentTerm) => {
    setEditingTerm(term);
    setFormData({
      code: term.code,
      name: term.name,
      description: term.description || '',
      daysUntilDue: term.daysUntilDue,
      discountPercentage: term.discountPercentage?.toString() || '',
      discountDays: term.discountDays?.toString() || '',
      isDefault: term.isDefault,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment term?')) return;

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/payment-terms/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTerms();
      }
    } catch (error) {
      console.error('Error deleting payment term:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      daysUntilDue: 30,
      discountPercentage: '',
      discountDays: '',
      isDefault: false,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Terms</h1>
            <p className="text-gray-600 mt-1">Configure payment terms for customers and vendors</p>
          </div>
        </div>
        
        <button
          onClick={() => {
            setShowForm(true);
            setEditingTerm(null);
            resetForm();
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Payment Term
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTerm ? 'Edit Payment Term' : 'New Payment Term'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., NET30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Net 30 Days"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="e.g., Payment due within 30 days"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days Until Due *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.daysUntilDue}
                  onChange={(e) => setFormData({ ...formData, daysUntilDue: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discountPercentage}
                  onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Days
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.discountDays}
                  onChange={(e) => setFormData({ ...formData, discountDays: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 10"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                Set as default payment term
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTerm(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingTerm ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Terms List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Days
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Discount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {terms.map((term) => (
              <tr key={term.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{term.code}</span>
                    {term.isDefault && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{term.name}</div>
                  {term.description && (
                    <div className="text-xs text-gray-500">{term.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {term.daysUntilDue} days
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {term.discountPercentage && term.discountDays ? (
                    <span className="text-green-700">
                      {term.discountPercentage}% / {term.discountDays}d
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {term.isActive ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(term)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(term.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
