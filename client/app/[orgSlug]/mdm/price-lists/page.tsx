'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface PriceList {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  isDefault: boolean;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  prices: Array<{
    id: string;
    price: number;
    minQuantity: number | null;
    maxQuantity: number | null;
    product: {
      sku: string;
      name: string;
    };
  }>;
}

export default function PriceListsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPriceLists();
  }, [orgSlug]);

  const fetchPriceLists = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/mdm/price-lists`);
      const data = await response.json();

      if (data.success) {
        setPriceLists(data.data);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to fetch price lists');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading price lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Price Lists</h1>
          <p className="text-gray-600 mt-1">Manage product pricing and price tiers</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create Price List
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {priceLists.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No price lists found. Create your first price list.
          </div>
        ) : (
          priceLists.map((priceList) => (
            <div key={priceList.id} className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold">{priceList.name}</h2>
                      {priceList.isDefault && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          DEFAULT
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          priceList.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {priceList.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {priceList.description && (
                      <p className="text-gray-600 mt-1">{priceList.description}</p>
                    )}
                    <div className="mt-2 flex gap-4 text-sm text-gray-500">
                      <span>Currency: {priceList.currency}</span>
                      {priceList.validFrom && (
                        <span>
                          Valid from: {new Date(priceList.validFrom).toLocaleDateString()}
                        </span>
                      )}
                      {priceList.validTo && (
                        <span>Valid to: {new Date(priceList.validTo).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <button className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
                    Edit
                  </button>
                </div>
              </div>

              {priceList.prices.length > 0 && (
                <div className="p-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Items ({priceList.prices.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            SKU
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Product
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Price
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Min Qty
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Max Qty
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {priceList.prices.slice(0, 5).map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.product.sku}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.product.name}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {priceList.currency} {item.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500 text-right">
                              {item.minQuantity || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500 text-right">
                              {item.maxQuantity || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {priceList.prices.length > 5 && (
                      <div className="mt-2 text-center text-sm text-gray-500">
                        +{priceList.prices.length - 5} more items
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
