'use client';

import { Portal } from '@/components/Portal';
import { useState } from 'react';
import { FilterCheckboxRow, FilterTrigger } from './FilterControls';
import { useColumnFilterDropdown } from './useColumnFilterDropdown';

interface LoanTypeFilterProps {
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
}

export default function LoanTypeFilter({ options, selectedValues, onChange }: LoanTypeFilterProps) {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedValues);
  const { isOpen, setIsOpen, dropdownRef, menuRef, triggerRef, dropdownPos, toggleDropdown: handleClick } = useColumnFilterDropdown({
    menuWidth: 300,
    onOpen: () => setTempSelected(selectedValues),
  });

  const toggleOption = (option: string) => {
    if (option === 'All') {
      if (tempSelected.length === options.length) {
        setTempSelected([]);
      } else {
        setTempSelected([...options]);
      }
      return;
    }

    if (tempSelected.includes(option)) {
      setTempSelected(tempSelected.filter(o => o !== option));
    } else {
      setTempSelected([...tempSelected, option]);
    }
  };

  const handleClear = () => {
    setTempSelected([]);
  };

  const handleApply = () => {
    onChange(tempSelected);
    setIsOpen(false);
  };



  const isAllSelected = tempSelected.length === options.length;

  return (
    <div ref={dropdownRef} className="inline-block">
      <FilterTrigger
        ref={triggerRef}
        label="LOAN TYPE"
        isOpen={isOpen}
        isActive={selectedValues.length > 0}
        onClick={handleClick}
      />

      {isOpen && (
        <Portal>
          <div
            ref={menuRef}
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            className="absolute bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-xl overflow-hidden z-[100] w-[300px] flex flex-col animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Loan Product</span>
            </div>

            {/* Options List */}
            <div role="group" aria-label="Loan product" className="flex flex-col py-2 max-h-[300px] overflow-y-auto">
              <FilterCheckboxRow checked={isAllSelected} onToggle={() => toggleOption('All')}>
                All
              </FilterCheckboxRow>

              {options.map(option => (
                <FilterCheckboxRow
                  key={option}
                  checked={tempSelected.includes(option)}
                  onToggle={() => toggleOption(option)}
                >
                  {option}
                </FilterCheckboxRow>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <button
                onClick={handleClear}
                className="text-[14px] font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >

                <span className='font-semibold'>Clear</span>
              </button>
              <button
                onClick={handleApply}
                className="bg-[#16A34A] hover:bg-[#10883c] text-white px-6 py-2 rounded-lg text-[14px] font-semibold transition-colors shadow-sm"
              >

                <span className='font-semibold'>Apply</span>
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
