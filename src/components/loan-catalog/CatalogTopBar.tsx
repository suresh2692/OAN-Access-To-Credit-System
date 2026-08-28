'use client';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CatalogSortKey } from '@/types/loan-catalog';

interface CatalogTopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: CatalogSortKey;
  onSortChange: (sort: CatalogSortKey) => void;
}

// Each option maps 1:1 onto a key in _SORT_COLUMNS in api/v1/farmer/catalog.py.
// The previous "Best Match" option had no backend equivalent and no ranking
// behind it, so it sorted nothing — the labels here are only the orderings the
// catalog can actually perform.
const SORT_OPTIONS: ReadonlyArray<{ value: CatalogSortKey; label: string }> = [
  { value: 'product_name', label: 'Name: A to Z' },
  { value: 'interest_low_high', label: 'Interest: Low to High' },
  { value: 'amount_high_low', label: 'Amount: High to Low' },
  { value: 'amount_low_high', label: 'Amount: Low to High' },
  { value: 'tenure_low_high', label: 'Tenure: Shortest First' },
  { value: 'newest', label: 'Newest First' },
];

export default function CatalogTopBar({ searchQuery, onSearchChange, sortBy, onSortChange }: CatalogTopBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const currentSortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? SORT_OPTIONS[0]!.label;

  return (
    <div className="relative z-30 flex flex-col gap-4 mb-6 bg-white border border-[#F1F3F4] rounded-xl p-4 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-[18px] w-[18px] text-gray-400" strokeWidth={2} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 border border-[#E5E7EB] rounded-xl text-[15px] bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-colors"
            // Search matches the product name — the only text field the catalog
            // endpoint searches. Promising bank or crop search would be a lie.
            placeholder="Search loan products..."
          />
        </div>

        {/* Custom Animated Sort Dropdown */}
        <div className="relative shrink-0 w-full sm:w-[190px]" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            className="flex items-center justify-between w-full pl-4 pr-4 py-3 border border-[#E5E7EB] rounded-xl text-[15px] bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors font-medium text-left"
          >
            <span className="truncate">{currentSortLabel}</span>
            <ChevronDown
              className={`h-[18px] w-[18px] text-gray-500 transition-transform duration-200 shrink-0 ml-2 ${isDropdownOpen ? 'rotate-180' : ''}`}
              strokeWidth={2.5}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-full min-w-[220px] bg-white border border-gray-100 shadow-lg rounded-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSortChange(opt.value);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${sortBy === opt.value
                      ? 'bg-green-50/50 text-green-700 font-bold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium'
                    }`}
                >
                  {opt.label}
                  {sortBy === opt.value && <Check className="w-4 h-4 text-green-600" strokeWidth={3} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
