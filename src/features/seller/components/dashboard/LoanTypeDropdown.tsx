'use client';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface LoanTypeOption {
  term_id: string;
  term_name: string;
}

const DEFAULT_LOAN_TYPES: LoanTypeOption[] = [
  { term_id: 'seed', term_name: 'Seed' },
  { term_id: 'input', term_name: 'Input' },
  { term_id: 'equipment', term_name: 'Equipment' },
  { term_id: 'livestock', term_name: 'Livestock' },
];

interface LoanTypeDropdownProps {
  selectedTypes: string[];
  options?: LoanTypeOption[] | string[] | undefined;
  placeholder?: string | undefined;
  singleSelect?: boolean;
  hideCheckbox?: boolean;
  disabled?: boolean;
  onChange: (types: string[]) => void;
}

export function LoanTypeDropdown({ selectedTypes, options, placeholder, singleSelect = false, hideCheckbox = false, disabled = false, onChange }: LoanTypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEscapeToClose(isOpen, () => setIsOpen(false), dropdownRef);

  const formattedOptions: LoanTypeOption[] = options && options.length > 0
    ? options.map((opt) => (typeof opt === 'string' ? { term_id: opt, term_name: opt } : opt))
    : DEFAULT_LOAN_TYPES;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (idOrName: string) => {
    if (singleSelect) {
      if (selectedTypes.includes(idOrName)) {
        onChange([]);
      } else {
        onChange([idOrName]);
      }
      setIsOpen(false);
      return;
    }

    if (selectedTypes.includes(idOrName)) {
      onChange(selectedTypes.filter((t) => t !== idOrName));
    } else {
      onChange([...selectedTypes, idOrName]);
    }
  };

  const selectedDisplayNames = formattedOptions
    .filter((opt) => selectedTypes.includes(opt.term_id) || selectedTypes.includes(opt.term_name))
    .map((opt) => opt.term_name);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex w-full ${disabled ? 'cursor-not-allowed opacity-70 bg-gray-50' : 'cursor-pointer'} items-center justify-between rounded-lg border border-[#D1D5DB] bg-white px-4 py-2.5 transition-all focus-within:border-[#16A34A] focus-within:ring-1 focus-within:ring-[#16A34A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C48C]`}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((o) => !o);
          }
        }}
      >
        <div className="flex-1 truncate pr-4 text-[14px] text-[#1F2937]">
          {selectedDisplayNames.length > 0 ? (
            selectedDisplayNames.join(', ')
          ) : (
            <span className="text-[#6B7280]">{placeholder ?? 'Select Loan Type'}</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 animate-in fade-in slide-in-from-top-2 duration-200 rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-xl">
          {formattedOptions.map((opt, index) => {
            const isChecked = selectedTypes.includes(opt.term_id) || selectedTypes.includes(opt.term_name);
            return (
              <label
                key={opt.term_id}
                onClick={(e) => {
                  if (hideCheckbox) {
                    e.preventDefault();
                    handleToggle(opt.term_id);
                  }
                }}
                className={`group flex cursor-pointer items-center px-4 py-3 hover:bg-gray-50 ${index !== formattedOptions.length - 1 ? 'border-b border-gray-100' : ''
                  } ${isChecked && hideCheckbox ? 'bg-[#00C48C]/5' : ''}`}
              >
                {!hideCheckbox && (
                  <div className="relative mr-3 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(opt.term_id)}
                      onClick={(e) => e.stopPropagation()}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 bg-white transition-all duration-300 checked:border-[#00C48C] checked:bg-[#00C48C]"
                    />
                    <svg
                      className="pointer-events-none absolute h-3.5 w-3.5 scale-50 opacity-0 transition-all duration-300 stroke-white peer-checked:scale-100 peer-checked:opacity-100"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                )}
                <span className={`text-[14px] transition-colors group-hover:text-[#1F2937] ${isChecked && hideCheckbox ? 'text-[#00C48C] font-semibold' : 'text-[#4B5563]'
                  }`}>
                  {opt.term_name}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
