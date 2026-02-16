'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface CommodityCategory {
  commodityCategoryCode: string;
  commodityCategoryName: string;
  rate: string;
  isLeafNode: string; // "101" = Yes, "102" = No
  serviceMark: string; // "101" = Service, "102" = Goods
  excisable: string; // "101" = Yes, "102" = No
  parentCode: string;
  commodityCategoryLevel: string;
}

interface CommodityCategorySelectorProps {
  orgSlug: string;
  value?: string;
  onChange: (code: string, label: string) => void;
  className?: string;
}

/**
 * CommodityCategorySelector Component
 * 
 * Fetches and displays EFRIS VAT commodity categories for product classification
 */
export default function CommodityCategorySelector({
  orgSlug,
  value,
  onChange,
  className = '',
}: CommodityCategorySelectorProps) {
  const [categories, setCategories] = useState<CommodityCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Load all categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/orgs/${orgSlug}/efris/commodity-categories?pageSize=100`;
      const res = await fetch(url);
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to load' }));
        // If commodity categories endpoint not available yet, show friendly message
        if (res.status === 404 || res.status === 500) {
          console.warn('[EFRIS] Commodity categories endpoint not available - using placeholder');
          setError('VAT category lookup temporarily unavailable. You can still enter manually.');
          setCategories([]);
          return;
        }
        throw new Error(data.error || 'Failed to load commodity categories');
      }

      const data = await res.json();
      setCategories(data.data?.records || []);
    } catch (err) {
      console.error('Error loading commodity categories:', err);
      setError('VAT category lookup temporarily unavailable');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = (category: CommodityCategory) => {
    const label = `${category.commodityCategoryCode} - ${category.commodityCategoryName} (${parseFloat(category.rate) * 100}%)`;
    onChange(category.commodityCategoryCode, label);
    setShowResults(false);
    setSearchTerm('');
  };

  const selectedCategory = value ? categories.find((c) => c.commodityCategoryCode === value) : null;

  // Filter categories by search term
  const filteredCategories = searchTerm
    ? categories.filter((c) =>
        c.commodityCategoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.commodityCategoryCode.includes(searchTerm)
      )
    : categories;

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        VAT Commodity Category
      </label>

      {/* Current Selection */}
      {selectedCategory && (
        <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-semibold text-blue-900">{selectedCategory.commodityCategoryCode}</div>
              <div className="text-blue-800 mt-0.5">{selectedCategory.commodityCategoryName}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  VAT {parseFloat(selectedCategory.rate) * 100}%
                </span>
                {selectedCategory.serviceMark === '101' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Service
                  </span>
                )}
                {selectedCategory.serviceMark === '102' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Goods
                  </span>
                )}
                {selectedCategory.excisable === '101' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    Excisable
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange('', '')}
              className="ml-2 text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder={categories.length > 0 ? "Search VAT categories..." : "Enter category code (e.g., 10111301)"}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      {/* Manual Entry Helper */}
      {searchTerm && filteredCategories.length === 0 && !loading && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
          <p className="text-blue-900 font-medium">Manual Entry</p>
          <p className="text-blue-700 mt-1">
            Press Enter to use "{searchTerm}" as the category code
          </p>
          <button
            type="button"
            onClick={() => {
              onChange(searchTerm, `Manual: ${searchTerm}`);
              setShowResults(false);
              setSearchTerm('');
            }}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            Use this code
          </button>
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500">Loading VAT categories...</div>
          )}

          {error && (
            <div className="px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && filteredCategories.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">
              No categories found. Try a different search term.
            </div>
          )}

          {!loading && !error && filteredCategories.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                {filteredCategories.length} categor{filteredCategories.length === 1 ? 'y' : 'ies'} found
              </div>
              {filteredCategories.slice(0, 50).map((category) => (
                <button
                  key={category.commodityCategoryCode}
                  type="button"
                  onClick={() => selectCategory(category)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900">
                        {category.commodityCategoryCode}
                      </div>
                      <div className="text-sm text-gray-700 mt-0.5 line-clamp-2">
                        {category.commodityCategoryName}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-gray-600">
                          VAT: <strong>{parseFloat(category.rate) * 100}%</strong>
                        </span>
                        {category.serviceMark === '101' && (
                          <span className="text-xs text-green-600">Service</span>
                        )}
                        {category.serviceMark === '102' && (
                          <span className="text-xs text-purple-600">Goods</span>
                        )}
                        {category.excisable === '101' && (
                          <span className="text-xs text-orange-600">⚠ Excisable</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
