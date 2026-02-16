'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

export interface ExciseDutyCode {
  exciseDutyCode: string;
  goodService: string;
  rateText: string;
  effectiveDate: string;
  parentCode?: string;
  isLeafNode: string;
  rate?: string;
  unit?: string;
  unitDisplay?: string;
  currency?: string;
  excise_rule?: string;
}

interface ExciseDutySelectorProps {
  orgSlug: string;
  value?: string;
  onChange: (code: string, label: string, exciseData?: ExciseDutyCode) => void;
  className?: string;
}

/**
 * ExciseDutySelector Component
 * 
 * Fetches and displays EFRIS excise duty codes for products
 * that require excise tax (alcohol, tobacco, fuel, etc.)
 */
export default function ExciseDutySelector({
  orgSlug,
  value,
  onChange,
  className = '',
}: ExciseDutySelectorProps) {
  const [codes, setCodes] = useState<ExciseDutyCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Load all codes on mount
  useEffect(() => {
    loadExciseCodes();
  }, []);

  // Search with debounce
  useEffect(() => {
    if (!searchTerm) {
      loadExciseCodes();
      return;
    }

    const timer = setTimeout(() => {
      loadExciseCodes(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadExciseCodes = async (search?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/orgs/${orgSlug}/efris/excise-codes${
        search ? `?excise_name=${encodeURIComponent(search)}` : ''
      }`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load excise codes');
      }

      setCodes(data.data || []);
    } catch (err) {
      console.error('Error loading excise codes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load excise codes');
      setCodes([]);
    } finally {
      setLoading(false);
    }
  };

  const selectCode = (code: ExciseDutyCode) => {
    const label = `${code.exciseDutyCode} - ${code.goodService} (${code.rateText})`;
    onChange(code.exciseDutyCode, label, code);
    setShowResults(false);
    setSearchTerm('');
  };

  const selectedCode = value ? codes.find((c) => c.exciseDutyCode === value) : null;

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Excise Duty Code
      </label>

      {/* Current Selection */}
      {selectedCode && (
        <div className="mb-2 p-3 bg-purple-50 border border-purple-200 rounded-md text-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-semibold text-purple-900">{selectedCode.exciseDutyCode}</div>
              <div className="text-purple-800 mt-0.5">{selectedCode.goodService}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  {selectedCode.rateText}
                </span>
                {selectedCode.currency && selectedCode.currency !== 'UGX' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {selectedCode.currency}
                  </span>
                )}
                {selectedCode.excise_rule === '2' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    Dual Rate
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange('', '', undefined)}
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
          placeholder="Search excise codes (e.g., beer, alcohol, fuel)..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500">Loading excise codes...</div>
          )}

          {error && (
            <div className="px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && codes.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">
              No excise codes found. Try a different search term.
            </div>
          )}

          {!loading && !error && codes.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                {codes.length} code(s) found
              </div>
              {codes.map((code) => (
                <button
                  key={code.exciseDutyCode}
                  type="button"
                  onClick={() => selectCode(code)}
                  className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-gray-100 last:border-0 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900">
                        {code.exciseDutyCode}
                      </div>
                      <div className="text-sm text-gray-700 mt-0.5 line-clamp-2">
                        {code.goodService}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {code.rate && (
                          <span className="text-xs text-gray-600">
                            Rate: <strong>{code.rate}</strong>
                          </span>
                        )}
                        {code.unitDisplay && (
                          <span className="text-xs text-gray-600">
                            {code.unitDisplay}
                          </span>
                        )}
                        {code.currency && code.currency !== 'UGX' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            {code.currency}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded whitespace-nowrap">
                        {code.rateText || 'No rate'}
                      </div>
                      {code.excise_rule === '2' && (
                        <div className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded mt-1 text-center">
                          Dual
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}

      <p className="mt-1 text-xs text-gray-500">
        Required for products subject to excise duty (alcohol, tobacco, fuel, etc.)
      </p>
    </div>
  );
}
