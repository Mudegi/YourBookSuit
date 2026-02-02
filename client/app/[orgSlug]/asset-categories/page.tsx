'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  code: string;
  description: string | null;
  defaultDepreciationMethod: string;
  defaultUsefulLifeYears: number;
  ugandaTaxRate: number;
  _count: {
    assets: number;
  };
}

export default function AssetCategoriesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    defaultDepreciationMethod: 'STRAIGHT_LINE',
    defaultUsefulLifeYears: 5,
    ugandaTaxRate: 0.25,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/asset-categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/asset-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setCategories([...categories, data.data]);
        setIsAdding(false);
        resetForm();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const response = await fetch(`/api/${orgSlug}/asset-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setCategories(categories.map((c) => (c.id === id ? data.data : c)));
        setEditingId(null);
        resetForm();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDelete = async (id: string, assetCount: number) => {
    if (assetCount > 0) {
      alert(`Cannot delete category with ${assetCount} assets. Move or delete the assets first.`);
      return;
    }

    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const response = await fetch(`/api/${orgSlug}/asset-categories/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setCategories(categories.filter((c) => c.id !== id));
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description || '',
      defaultDepreciationMethod: category.defaultDepreciationMethod,
      defaultUsefulLifeYears: category.defaultUsefulLifeYears,
      ugandaTaxRate: category.ugandaTaxRate,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      defaultDepreciationMethod: 'STRAIGHT_LINE',
      defaultUsefulLifeYears: 5,
      ugandaTaxRate: 0.25,
    });
  };

  const getMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      STRAIGHT_LINE: 'Straight Line',
      DECLINING_BALANCE: 'Declining Balance',
      DOUBLE_DECLINING_BALANCE: 'Double Declining',
      SUM_OF_YEARS_DIGITS: 'Sum of Years Digits',
      UNITS_OF_PRODUCTION: 'Units of Production',
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asset Categories</h1>
          <p className="text-gray-600 mt-1">Manage fixed asset categories and depreciation defaults</p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Category
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{isAdding ? 'Add New Category' : 'Edit Category'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Vehicles & Equipment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="VEH"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
                placeholder="Motor vehicles, trucks, and heavy equipment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Method</label>
              <select
                value={formData.defaultDepreciationMethod}
                onChange={(e) => setFormData({ ...formData, defaultDepreciationMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="STRAIGHT_LINE">Straight Line</option>
                <option value="DECLINING_BALANCE">Declining Balance</option>
                <option value="DOUBLE_DECLINING_BALANCE">Double Declining Balance</option>
                <option value="SUM_OF_YEARS_DIGITS">Sum of Years Digits</option>
                <option value="UNITS_OF_PRODUCTION">Units of Production</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Useful Life (Years) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.defaultUsefulLifeYears}
                onChange={(e) => setFormData({ ...formData, defaultUsefulLifeYears: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uganda Tax Rate <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.ugandaTaxRate}
                onChange={(e) => setFormData({ ...formData, ugandaTaxRate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                step="0.01"
                min="0"
                max="1"
              />
              <p className="text-xs text-gray-500 mt-1">Enter as decimal (e.g., 0.25 for 25%)</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={cancelEdit} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <X className="w-4 h-4 inline mr-1" />
              Cancel
            </button>
            <button
              onClick={() => (isAdding ? handleCreate() : handleUpdate(editingId!))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4 inline mr-1" />
              {isAdding ? 'Create' : 'Update'}
            </button>
          </div>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Code</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Depreciation Method</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Useful Life</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">URA Rate</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Assets</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  No categories found. Click "New Category" to create one.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{category.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{category.name}</div>
                    {category.description && <div className="text-sm text-gray-500">{category.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm">{getMethodLabel(category.defaultDepreciationMethod)}</td>
                  <td className="px-4 py-3 text-sm">{category.defaultUsefulLifeYears} years</td>
                  <td className="px-4 py-3 text-sm">{(category.ugandaTaxRate * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {category._count.assets} assets
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(category)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id, category._count.assets)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
