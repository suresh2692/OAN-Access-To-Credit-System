'use client';

import { Portal } from '@/components/Portal';
import { LOAN_AMOUNT_BUCKET_LABELS, loanAmountCeilingLabel } from '@/features/loans/constants/loans.constants';
import { useRef, useState } from 'react';
import { FilterCheckboxRow, FilterTrigger } from './FilterControls';
import { useColumnFilterDropdown } from './useColumnFilterDropdown';

interface LoanAmountFilterProps {
  selectedValues: string[];
  onChange: (selected: string[]) => void;
}

// The shared buckets, minus the trailing "All Amounts" entry — this control expresses
// that as every bucket ticked. This was the fourth private copy of the same four
// labels; the copies had drifted, so the same bucket was named differently depending
// on which filter you opened.
const rangeOptions = LOAN_AMOUNT_BUCKET_LABELS;

export default function LoanAmountFilter({ selectedValues, onChange }: LoanAmountFilterProps) {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedValues);
  const { isOpen, setIsOpen, dropdownRef, menuRef, triggerRef, dropdownPos, toggleDropdown: handleClick } = useColumnFilterDropdown({
    menuWidth: 340, // 340px for LoanAmountFilter based on w-[340px] in portal
    onOpen: () => setTempSelected(selectedValues),
  });
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleSliderInteraction = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let newMaxIndex = Math.round(percent * rangeOptions.length);

    // Clamp to 1 so the slider doesn't collapse to 0% (which would mean 0 ETB)
    if (newMaxIndex === 0) newMaxIndex = 1;

    setTempSelected(rangeOptions.slice(0, newMaxIndex));
  };



  const toggleOption = (option: string) => {
    if (option === 'All') {
      if (tempSelected.length === rangeOptions.length) {
        setTempSelected([]);
      } else {
        setTempSelected([...rangeOptions]);
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



  // Dynamic Slider Logic
  let displayMaxIndex = rangeOptions.length;

  if (tempSelected.length > 0) {
    const selectedIndices = tempSelected.map(opt => rangeOptions.indexOf(opt)).filter(i => i !== -1);
    if (selectedIndices.length > 0) {
      displayMaxIndex = Math.max(...selectedIndices) + 1;
    }
  }

  const maxPercent = (displayMaxIndex / rangeOptions.length) * 100;
  // The top bucket is open-ended, so the widest selection reads "100,000+". The scale
  // used to close at a flat 1,000,000 — a ceiling the endpoint does not apply, which
  // made this control claim a limit that did not exist.
  const maxLabel = loanAmountCeilingLabel(displayMaxIndex);

  return (
    <div ref={dropdownRef} className="inline-block">
      <FilterTrigger
        ref={triggerRef}
        label="LOAN AMOUNT (ETB)"
        isOpen={isOpen}
        isActive={selectedValues.length > 0}
        onClick={handleClick}
      />

      {isOpen && (
        <Portal>
          <div
            ref={menuRef}
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            className="absolute bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-xl overflow-hidden z-[100] w-[340px] flex flex-col animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="px-6 py-4">
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Loan Amount</span>
            </div>

            {/* Slider Section */}
            <div className="px-6 pt-2 pb-6 border-b border-gray-100">
              <div
                ref={sliderRef}
                className="relative h-2.5 bg-gray-100 rounded-full w-full mb-6 cursor-pointer touch-none"
                onPointerDown={(e) => {
                  e.preventDefault();
                  sliderRef.current?.setPointerCapture(e.pointerId);
                  handleSliderInteraction(e);
                }}
                onPointerMove={(e) => {
                  if (e.buttons === 1) {
                    handleSliderInteraction(e);
                  }
                }}
              >
                <div
                  className="absolute top-0 left-0 h-full bg-[#16A34A] rounded-full transition-all duration-75"
                  style={{ width: `${maxPercent}%` }}
                ></div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-[#16A34A] rounded-full shadow-sm cursor-grab active:cursor-grabbing transition-all duration-75 z-10 hover:scale-110"
                  style={{ left: `${maxPercent}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col items-start min-w-[50px]">
                  <span className="text-[10px] font-bold text-gray-400">ETB</span>
                  <span className="text-[13px] font-bold text-gray-600">0</span>
                </div>

                <button
                  onClick={() => toggleOption('All')}
                  className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap ${tempSelected.length === rangeOptions.length || tempSelected.length === 0 ? 'bg-emerald-50 text-[#16A34A]' : 'bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-[#16A34A]'
                    }`}
                >
                  All Amounts
                </button>

                <div className="flex flex-col items-end min-w-[50px]">
                  <span className="text-[10px] font-bold text-gray-400">ETB</span>
                  <span className="text-[13px] font-bold text-gray-600">{maxLabel}</span>
                </div>
              </div>
            </div>

            {/* Range Options */}
            <div role="group" aria-label="Loan amount" className="flex flex-col py-2 max-h-[250px] overflow-y-auto">
              <FilterCheckboxRow
                checked={tempSelected.length === rangeOptions.length}
                onToggle={() => toggleOption('All')}
                padding="px-6 py-3"
              >
                All
              </FilterCheckboxRow>

              {rangeOptions.map(option => (
                <FilterCheckboxRow
                  key={option}
                  checked={tempSelected.includes(option)}
                  onToggle={() => toggleOption(option)}
                  padding="px-6 py-3"
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
