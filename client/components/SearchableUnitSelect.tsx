'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  abbreviation: string;
  category?: string;
}

interface SearchableSelectProps {
  options: UnitOfMeasure[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function SearchableUnitSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  // Filter options based on search term
  const filteredOptions = options.filter((option) => {
    const search = searchTerm.toLowerCase();
    return (
      option.name.toLowerCase().includes(search) ||
      option.abbreviation.toLowerCase().includes(search) ||
      option.code.toLowerCase().includes(search) ||
      (option.category && option.category.toLowerCase().includes(search))
    );
  });

  // Group options by category
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    const category = option.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(option);
    return acc;
  }, {} as Record<string, UnitOfMeasure[]>);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const categoryOrder = ['quantity', 'weight', 'volume', 'length', 'area', 'time', 'container', 'power', 'service', 'currency', 'other'];
  const sortedCategories = Object.keys(groupedOptions).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 
          bg-white border border-gray-300 rounded-md shadow-sm
          text-left text-sm
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? (
            <>
              {selectedOption.name} ({selectedOption.abbreviation})
              {selectedOption.category && (
                <span className="text-xs text-gray-500 ml-2">· {selectedOption.category}</span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <X
              className="w-4 h-4 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            />
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search units..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-64">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No units found matching "{searchTerm}"
              </div>
            ) : (
              sortedCategories.map((category) => (
                <div key={category}>
                  <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                    {category}
                  </div>
                  {groupedOptions[category].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(option.id)}
                      className={`
                        w-full text-left px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer
                        ${option.id === value ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option.name}</span>
                        <span className="text-xs text-gray-500 ml-2">{option.abbreviation}</span>
                      </div>
                      {option.code && (
                        <div className="text-xs text-gray-500 mt-0.5">Code: {option.code}</div>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-3 py-2 text-xs text-gray-500">
            {filteredOptions.length} of {options.length} units
          </div>
        </div>
      )}
    </div>
  );
}
