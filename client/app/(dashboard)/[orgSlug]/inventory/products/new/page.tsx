'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import SearchableUnitSelect from '@/components/SearchableUnitSelect';
import Link from 'next/link';
import { toast } from 'sonner';

interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  abbreviation: string;
  category?: string;
}

export default function NewProductPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  const [form, setForm] = useState({
    sku: '',
    name: '',
    description: '',
    productType: 'INVENTORY',
    category: '',
    unitOfMeasureId: '',
    purchasePrice: '0',
    sellingPrice: '0',
    trackInventory: true,
    reorderLevel: '',
    reorderQuantity: '',
    taxable: true,
    defaultTaxRate: '0',
    initialQuantity: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [newUnit, setNewUnit] = useState({ code: '', name: '', abbreviation: '', category: 'other' });
  const [addingUnit, setAddingUnit] = useState(false);
  const [unitError, setUnitError] = useState<string | null>(null);
  const { organization } = useOrganization();

  // Fetch units of measure on mount
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const response = await fetch(`/api/${orgSlug}/units-of-measure`);
        if (!response.ok) throw new Error('Failed to fetch units');
        const data = await response.json();
        setUnits(data);
        // Set default to first unit if available and not a service
        if (data.length > 0 && !form.unitOfMeasureId && form.productType !== 'SERVICE') {
          setForm((prev) => ({
            ...prev,
            unitOfMeasureId: data[0].id,
          }));
        }
      } catch (err) {
        console.error('Error fetching units:', err);
      } finally {
        setLoadingUnits(false);
      }
    };
    fetchUnits();
  }, [orgSlug]);

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUnit(true);
    setUnitError(null);

    try {
      const response = await fetch(`/api/${orgSlug}/units-of-measure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUnit),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create unit');
      }

      const createdUnit = await response.json();
      
      // Add to units list and select it
      setUnits((prev) => [...prev, createdUnit]);
      setForm((prev) => ({
        ...prev,
        unitOfMeasureId: createdUnit.id,
      }));

      // Reset form and close modal
      setNewUnit({ code: '', name: '', abbreviation: '', category: 'other' });
      setShowAddUnitModal(false);
    } catch (err) {
      setUnitError(err instanceof Error ? err.message : 'Failed to create unit');
    } finally {
      setAddingUnit(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const name = (target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).name;
    const value = (target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;

    if (name === 'productType') {
      const nextType = value;
      setForm((prev) => ({
        ...prev,
        productType: nextType,
        trackInventory: nextType === 'INVENTORY',
      }));
      return;
    }

    let nextVal: string | boolean = value;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      nextVal = target.checked;
    }

    setForm((prev) => ({
      ...prev,
      [name]: nextVal,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/${orgSlug}/inventory/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          purchasePrice: Number(form.purchasePrice || 0),
          sellingPrice: Number(form.sellingPrice || 0),
          reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
          reorderQuantity: form.reorderQuantity ? Number(form.reorderQuantity) : undefined,
          initialQuantity: form.initialQuantity ? Number(form.initialQuantity) : 0,
          defaultTaxRate: Number(form.defaultTaxRate || 0),
          // Only include unitOfMeasureId if it's set
          ...(form.unitOfMeasureId && { unitOfMeasureId: form.unitOfMeasureId }),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create product');
      }

      const product = await res.json();

      // Use replace instead of push to prevent back button loop
      router.replace(`/${orgSlug}/inventory/products`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">New Product</h1>
            <p className="text-gray-600 mt-1">Create inventory, services, or non-inventory items.</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/${orgSlug}/inventory/products`)}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="new-product-form"
              disabled={submitting}
              className="px-4 py-2 rounded-md bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save Product'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form id="new-product-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Basic Information</h2>
              <p className="text-xs text-gray-500 mt-1">Key details to identify the product.</p>
            </div>
            <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU<span className="text-red-500">*</span></label>
                <input
                  name="sku"
                  value={form.sku}
                  onChange={onChange}
                  required
                  placeholder="e.g., 44102906"
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Commodity code (can be shared by multiple products).</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name<span className="text-red-500">*</span></label>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  required
                  placeholder="e.g., Premium Notebook"
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Shown on invoices and reports.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Type</label>
                <select
                  name="productType"
                  value={form.productType}
                  onChange={onChange}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="INVENTORY">Inventory</option>
                  <option value="SERVICE">Service</option>
                  <option value="NON_INVENTORY">Non-Inventory</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Inventory tracks quantity; services and non-inventory do not.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  placeholder="e.g., Stationery"
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {form.productType !== 'SERVICE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit of Measure</label>
                  <div className="mt-1 flex gap-2">
                    <SearchableUnitSelect
                      options={units}
                      value={form.unitOfMeasureId}
                      onChange={(value) => setForm((prev) => ({ ...prev, unitOfMeasureId: value }))}
                      placeholder={loadingUnits ? 'Loading units...' : 'Search and select a unit...'}
                      disabled={loadingUnits}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddUnitModal(true)}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium whitespace-nowrap"
                      title="Add custom unit of measure"
                    >
                      + Add
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Searchable dropdown - type to filter 528+ units by name, code, or category.</p>
                </div>
              )}
              <div className={form.productType === 'SERVICE' ? 'md:col-span-2' : 'md:col-span-2'}>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  rows={3}
                  placeholder="Enter product description"
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Pricing & Taxes</h2>
              <p className="text-xs text-gray-500 mt-1">Set selling, purchase price and tax behavior.</p>
            </div>
            <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Price</label>
                <input
                  name="purchasePrice"
                  type="number"
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={onChange}
                  placeholder="0.00"
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Selling Price</label>
                <input
                  name="sellingPrice"
                  type="number"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={onChange}
                  placeholder="0.00"
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Tax Rate (%)</label>
                <input
                  name="defaultTaxRate"
                  type="number"
                  step="0.01"
                  value={form.defaultTaxRate}
                  onChange={onChange}
                  placeholder="e.g., 18"
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-3">
                <div className="flex flex-wrap items-center gap-6">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="taxable"
                      checked={form.taxable}
                      onChange={onChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Taxable item</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Inventory & Reordering</h2>
              <p className="text-xs text-gray-500 mt-1">Track quantities and set reorder thresholds.</p>
            </div>
            <div className="px-5 py-5 space-y-5">
              <div className="flex flex-wrap items-center gap-6">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="trackInventory"
                    checked={form.trackInventory}
                    onChange={onChange}
                    disabled={form.productType !== 'INVENTORY'}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                  />
                  <span className="text-sm text-gray-700">Track inventory</span>
                </label>
                {form.productType !== 'INVENTORY' && (
                  <span className="text-xs text-gray-500">Inventory tracking is only available for Inventory type.</span>
                )}
              </div>

              {form.trackInventory && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Initial Quantity on Hand <span className="text-red-500">*</span></label>
                    <input
                      name="initialQuantity"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.initialQuantity}
                      onChange={onChange}
                      placeholder="e.g., 100"
                      className="mt-1 w-full md:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Opening stock quantity for this product. An initial stock movement will be recorded.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reorder Level</label>
                    <input
                      name="reorderLevel"
                      type="number"
                      step="0.01"
                      value={form.reorderLevel}
                      onChange={onChange}
                      placeholder="e.g., 10"
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Alert when stock drops below this level.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reorder Quantity</label>
                    <input
                      name="reorderQuantity"
                      type="number"
                      step="0.01"
                      value={form.reorderQuantity}
                      onChange={onChange}
                      placeholder="e.g., 50"
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Suggested purchase quantity when reordering.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          

          <div className="flex md:hidden flex-col gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 rounded-md bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save Product'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/${orgSlug}/inventory/products`)}
              className="w-full px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Add Custom Unit Modal */}
        {showAddUnitModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setShowAddUnitModal(false)}
              />

              {/* Modal */}
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Add Custom Unit of Measure
                      </h3>
                      
                      {unitError && (
                        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {unitError}
                        </div>
                      )}

                      <form onSubmit={handleAddUnit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Unit Code<span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={newUnit.code}
                            onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
                            placeholder="e.g., sqm, gal, bundle"
                            required
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">Unique code for this unit (lowercase).</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Unit Name<span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={newUnit.name}
                            onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                            placeholder="e.g., Square Meter, Gallon, Bundle"
                            required
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Abbreviation<span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={newUnit.abbreviation}
                            onChange={(e) => setNewUnit({ ...newUnit, abbreviation: e.target.value })}
                            placeholder="e.g., m², gal, bdl"
                            required
                            maxLength={10}
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Category</label>
                          <select
                            value={newUnit.category}
                            onChange={(e) => setNewUnit({ ...newUnit, category: e.target.value })}
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="quantity">Quantity</option>
                            <option value="weight">Weight</option>
                            <option value="length">Length</option>
                            <option value="volume">Volume</option>
                            <option value="area">Area</option>
                            <option value="time">Time</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                  <button
                    onClick={handleAddUnit}
                    disabled={addingUnit || !newUnit.code || !newUnit.name || !newUnit.abbreviation}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60"
                  >
                    {addingUnit ? 'Adding…' : 'Add Unit'}
                  </button>
                  <button
                    onClick={() => setShowAddUnitModal(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
