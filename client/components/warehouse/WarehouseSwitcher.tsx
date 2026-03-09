'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Warehouse as WarehouseIcon,
  ChevronDown,
  Check,
  MapPin,
  Star,
  Package,
} from 'lucide-react';

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
  type: string;
  isDefault: boolean;
  branchName?: string | null;
  productCount: number;
  stockValue: number;
}

interface WarehouseSwitcherProps {
  orgSlug: string;
  selectedWarehouseId: string | null;
  onWarehouseChange: (warehouseId: string | null) => void;
  /** Show "All Warehouses" option */
  showAll?: boolean;
  /** Compact mode for toolbars */
  compact?: boolean;
  /** className override */
  className?: string;
}

export default function WarehouseSwitcher({
  orgSlug,
  selectedWarehouseId,
  onWarehouseChange,
  showAll = true,
  compact = false,
  className = '',
}: WarehouseSwitcherProps) {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const res = await fetch(`/api/${orgSlug}/warehouse/warehouses?isActive=true&limit=100`);
        if (res.ok) {
          const json = await res.json();
          setWarehouses(json.data || []);
        }
      } catch (e) {
        console.error('Failed to load warehouses:', e);
      } finally {
        setLoading(false);
      }
    };
    if (orgSlug) loadWarehouses();
  }, [orgSlug]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
  const displayLabel = selectedWarehouse
    ? (compact ? selectedWarehouse.code : selectedWarehouse.name)
    : 'All Warehouses';

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400 ${className}`}>
        <WarehouseIcon className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  if (warehouses.length === 0) return null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors
          ${isOpen
            ? 'border-blue-500 ring-2 ring-blue-100 bg-white text-blue-700'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }
        `}
      >
        <WarehouseIcon className="h-4 w-4 text-gray-500" />
        <span className="truncate max-w-[160px]">{displayLabel}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-80 overflow-auto">
          {showAll && (
            <button
              onClick={() => { onWarehouseChange(null); setIsOpen(false); }}
              className={`w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors
                ${selectedWarehouseId === null ? 'bg-blue-50' : ''}
              `}
            >
              <Package className="h-4 w-4 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">All Warehouses</p>
                <p className="text-xs text-gray-500">Company-wide stock view</p>
              </div>
              {selectedWarehouseId === null && (
                <Check className="h-4 w-4 text-blue-600" />
              )}
            </button>
          )}

          {showAll && warehouses.length > 0 && (
            <div className="border-t border-gray-100 my-1" />
          )}

          {warehouses.map(w => (
            <button
              key={w.id}
              onClick={() => { onWarehouseChange(w.id); setIsOpen(false); }}
              className={`w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors
                ${selectedWarehouseId === w.id ? 'bg-blue-50' : ''}
              `}
            >
              <WarehouseIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-900 truncate">{w.name}</p>
                  {w.isDefault && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-mono">{w.code}</span>
                  {w.branchName && (
                    <>
                      <span>·</span>
                      <span>{w.branchName}</span>
                    </>
                  )}
                </div>
              </div>
              {selectedWarehouseId === w.id && (
                <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
