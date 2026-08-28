'use client';

import { Portal } from '@/components/Portal';
import { LOAN_AMOUNT_BUCKET_LABELS, loanAmountCeilingLabel } from '@/features/loans/constants/loans.constants';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { selectBankStageOptions } from '@/features/loans/store/bankApplicationsSlice';
import { useAppSelector } from '@/store/hooks';
import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface AdvancedFiltersState {
  status: string[];
  loanAmount: string[];
  loanType: string[];
  /**
   * Prefix-matched against `region` on the application.
   *
   * Was `location`, sent through to a `location` query param — a column that exists
   * on no doctype, so Frappe put it in the WHERE clause and the request came back a
   * database error rather than a filtered list.
   */
  region: string;
  quickDate?: string;
  dateRange: {
    from: string;
    to: string;
  };
}

interface AdvancedFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: AdvancedFiltersState) => void;
  initialFilters: AdvancedFiltersState;
  availableLoanTypes: string[];
  statusOptions?: ReadonlyArray<{ value: string; label: string; color: string }>;
}

// The shared buckets, minus the trailing "All Amounts" entry which this drawer
// expresses as "everything selected" instead. Was a private copy of the same four
// labels — one of four, which had already drifted apart.
const loanAmountOptions = LOAN_AMOUNT_BUCKET_LABELS;

// The widest the scale ever reads. The top bucket is open-ended, so this is
// "100,000+" — not the flat 1,000,000 that used to close it, which was a cap the
// endpoint does not apply.
const OPEN_ENDED_LABEL = loanAmountCeilingLabel(loanAmountOptions.length);

export default function AdvancedFiltersDrawer({
  isOpen,
  onClose,
  onApply,
  initialFilters,
  availableLoanTypes,
  statusOptions,
}: AdvancedFiltersDrawerProps) {
  const storeStageOptions = useAppSelector(selectBankStageOptions);
  const resolvedStatusOptions = statusOptions ?? storeStageOptions;
  const [filters, setFilters] = useState<AdvancedFiltersState>(initialFilters);
  const [isAmountOpen, setIsAmountOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const amountDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Reset the draft each time the drawer opens.
  //
  // Adjusted during render rather than in an effect. `isOpen` is owned by the
  // parent, so there is no local handler to hang this on — and the effect version
  // listed `initialFilters` as a dependency, which meant any new object identity
  // from the parent reset the form *while it was open*, discarding whatever the
  // person had just typed. Comparing against the previous `isOpen` fires only on
  // the closed → open edge, which is what "when the drawer opens" actually means.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setFilters(initialFilters);
      setIsAmountOpen(false);
      setIsTypeOpen(false);
    }
  }

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (amountDropdownRef.current && !amountDropdownRef.current.contains(event.target as Node)) {
        setIsAmountOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      status: [],
      loanAmount: [],
      loanType: [],
      region: '',
      dateRange: { from: '', to: '' }
    });
  };

  const toggleStatus = (statusValue: string) => {
    setFilters(prev => {
      const isSelected = prev.status.includes(statusValue);
      return {
        ...prev,
        status: isSelected
          ? prev.status.filter(s => s !== statusValue)
          : [...prev.status, statusValue]
      };
    });
  };

  const toggleLoanAmount = (amount: string) => {
    setFilters(prev => {
      const isSelected = prev.loanAmount.includes(amount);
      return {
        ...prev,
        loanAmount: isSelected
          ? prev.loanAmount.filter(a => a !== amount)
          : [...prev.loanAmount, amount]
      };
    });
  };

  const toggleAllLoanAmounts = () => {
    if (filters.loanAmount.length === loanAmountOptions.length) {
      setFilters(prev => ({ ...prev, loanAmount: [] }));
    } else {
      setFilters(prev => ({ ...prev, loanAmount: [...loanAmountOptions] }));
    }
  };

  const handleSliderInteraction = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let newMaxIndex = Math.round(percent * loanAmountOptions.length);

    if (newMaxIndex === 0) newMaxIndex = 1;

    setFilters(prev => ({ ...prev, loanAmount: loanAmountOptions.slice(0, newMaxIndex) }));
  };

  let displayMaxIndex = loanAmountOptions.length;

  if (filters.loanAmount.length > 0) {
    const selectedIndices = filters.loanAmount.map(opt => loanAmountOptions.indexOf(opt)).filter(i => i !== -1);
    if (selectedIndices.length > 0) {
      displayMaxIndex = Math.max(...selectedIndices) + 1;
    }
  }

  const maxPercent = (displayMaxIndex / loanAmountOptions.length) * 100;
  const maxLabel = loanAmountCeilingLabel(displayMaxIndex);

  const toggleLoanType = (type: string) => {
    setFilters(prev => {
      const isSelected = prev.loanType.includes(type);
      return {
        ...prev,
        loanType: isSelected
          ? prev.loanType.filter(t => t !== type)
          : [...prev.loanType, type]
      };
    });
  };

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[540px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ zIndex: 9999 }}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg width="24" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="8" cy="6" r="2" fill="white" stroke="#16A34A" strokeWidth="2" />
                <circle cx="16" cy="12" r="2" fill="white" stroke="#16A34A" strokeWidth="2" />
                <circle cx="10" cy="18" r="2" fill="white" stroke="#16A34A" strokeWidth="2" />
              </svg>
            </div>
            <h2 className="text-[18px] font-bold text-gray-800">Advanced Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Status */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-gray-700">Status</h3>
            <div className="grid grid-cols-2 gap-3">
              {resolvedStatusOptions.map(status => {
                // Selection is stored as the API status (`status.value`), never the
                // label — the label is presentation and would not match server-side.
                const isSelected = filters.status.includes(status.value);
                return (
                  <button
                    key={status.value}
                    onClick={() => toggleStatus(status.value)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-[14px] font-semibold transition-all ${isSelected
                      ? 'border-[#16A34A] bg-[#16A34A]/8 text-gray-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-[#10883c]/50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#16A34A] border-[#16A34A]' : 'border-gray-300'
                        }`}>
                        {isSelected && <Check size={16} className="text-white font-semibold" />}
                      </div>
                      {status.label}
                    </div>
                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loan Amount */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-gray-700">Loan Amount</h3>
            <div className="relative" ref={amountDropdownRef}>
              <button
                type="button"
                onClick={() => setIsAmountOpen(!isAmountOpen)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-[14px] font-medium transition-colors ${isAmountOpen ? 'border-[#16A34A] text-gray-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
              >
                {filters.loanAmount.length === 0
                  ? 'Select Loan Amount'
                  : filters.loanAmount.length === loanAmountOptions.length
                    ? 'All Amounts'
                    : filters.loanAmount.length === 1
                      ? `ETB ${filters.loanAmount[0]}`
                      : `${filters.loanAmount.length} selected`}
                <ChevronDown size={18} className={`transition-transform duration-200 ${isAmountOpen ? 'rotate-180 text-[#16A34A]' : 'text-gray-500'}`} />
              </button>

              {isAmountOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-lg shadow-lg z-10 flex flex-col">
                  {/* Slider Section */}
                  <div className="px-5 pt-6 pb-6 border-b border-gray-100">
                    <div
                      ref={sliderRef}
                      className="relative h-2.5 bg-gray-200 rounded-full w-full mb-6 cursor-pointer touch-none"
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
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border-4 border-[#16A34A] rounded-full shadow-sm cursor-grab active:cursor-grabbing transition-all duration-75 z-10"
                        style={{ left: `${maxPercent}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col items-start min-w-[50px]">
                        <span className="text-[11px] font-bold text-[#64748B] uppercase">ETB</span>
                        <span className="text-[14px] font-bold text-[#1E293B]">0</span>
                      </div>

                      <button
                        onClick={toggleAllLoanAmounts}
                        className={`px-4 py-1.5 rounded-lg text-[14px] font-semibold transition-colors whitespace-nowrap ${filters.loanAmount.length === loanAmountOptions.length || filters.loanAmount.length === 0 ? 'bg-emerald-50 text-[#16A34A]' : 'bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-[#16A34A]'
                          }`}
                      >
                        {filters.loanAmount.length === loanAmountOptions.length || filters.loanAmount.length === 0 ? 'All Amounts' : `ETB ${maxLabel}`}
                      </button>

                      <div className="flex flex-col items-end min-w-[50px]">
                        <span className="text-[11px] font-bold text-[#64748B] uppercase">ETB</span>
                        <span className="text-[14px] font-bold text-[#1E293B]">{OPEN_ENDED_LABEL}</span>
                      </div>
                    </div>
                  </div>

                  {/* Range Options */}
                  <div className="flex flex-col py-2">
                    {/* All Option */}
                    <button
                      onClick={toggleAllLoanAmounts}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 text-[14px] font-medium text-gray-700 transition-colors text-left"
                    >
                      <div className={`w-5 h-5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${filters.loanAmount.length === loanAmountOptions.length ? 'border-[#16A34A] bg-[#16A34A]' : 'border-gray-300 bg-white'}`}>
                        {filters.loanAmount.length === loanAmountOptions.length && <Check size={16} className="text-white" strokeWidth={3} />}
                      </div>
                      All
                    </button>

                    {loanAmountOptions.map(option => (
                      <button
                        key={option}
                        onClick={() => toggleLoanAmount(option)}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 text-[14px] font-medium text-gray-700 transition-colors text-left"
                      >
                        <div className={`w-5 h-5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${filters.loanAmount.includes(option) ? 'border-[#16A34A] bg-[#16A34A]' : 'border-gray-300 bg-white'}`}>
                          {filters.loanAmount.includes(option) && <Check size={16} className="text-white" strokeWidth={3} />}
                        </div>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Loan Type */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-gray-700">Loan Type</h3>
            <div className="relative" ref={typeDropdownRef}>
              <button
                type="button"
                onClick={() => setIsTypeOpen(!isTypeOpen)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white text-[14px] font-medium text-gray-600 hover:border-gray-300 transition-colors"
              >
                {filters.loanType.length > 0
                  ? `${filters.loanType.length} selected`
                  : 'Select Loan Type'}
                <ChevronDown size={18} className={`transition-transform duration-200 ${isTypeOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTypeOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border border-gray-100 rounded-lg shadow-lg z-10 flex flex-col gap-1 max-h-[240px] overflow-y-auto">
                  {availableLoanTypes.map(option => (
                    <button
                      key={option}
                      onClick={() => toggleLoanType(option)}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-[13px] font-medium text-gray-700 transition-colors text-left"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${filters.loanType.includes(option) ? 'bg-[#16A34A] border-[#16A34A]' : 'border-[#16A34A]/30'
                        }`}>
                        {filters.loanType.includes(option) && <Check size={12} className="text-white" />}
                      </div>
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Region */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-gray-700">Region</h3>
            <input
              type="text"
              value={filters.region}
              onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
              placeholder="Enter Region"
              className="w-full p-3 rounded-lg border border-gray-200 text-[14px] text-gray-700 focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
            />
            {/* Region only. The old placeholder invited a Woreda or Kebele and sent it
                as one free-text `location` — there is no such column, and no single
                field the three levels could all be matched against. */}
            <p className="text-[12px] text-gray-400">Matched from the start of the region name.</p>
          </div>

          <div className="pt-0">
            <h3 className="text-[14px] font-bold text-gray-700 mb-2">Date Range</h3>
            <DateRangeFilter
              dateFrom={filters.dateRange.from}
              dateTo={filters.dateRange.to}
              quickDate={filters.quickDate || ''}
              onDateFromChange={(v) => {
                setFilters(prev => ({
                  ...prev,
                  quickDate: '',
                  dateRange: { ...prev.dateRange, from: v }
                }));
              }}
              onDateToChange={(v) => {
                setFilters(prev => ({
                  ...prev,
                  quickDate: '',
                  dateRange: { ...prev.dateRange, to: v }
                }));
              }}
              onQuickDateChange={(label, from, to) => {
                setFilters(prev => ({
                  ...prev,
                  quickDate: label,
                  dateRange: { from, to }
                }));
              }}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-300 px-5 py-6 bg-gray-100 font-bold font-semibold">
          <button
            onClick={handleReset}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-4 mb-3 text-base font-semibold text-[#232F34] transition hover:bg-slate-50"
          >
            Reset Filters
          </button>
          <button
            onClick={handleApply}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] mb-3 py-3 text-sm font-semibold text-white transition hover:bg-[#10883c]"
          >
            Apply Filters
            {(filters.status.length > 0 || filters.loanAmount.length > 0 || filters.loanType.length > 0 || filters.region || filters.dateRange.from || filters.dateRange.to) && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-xs">
                {filters.status.length + filters.loanAmount.length + filters.loanType.length + (filters.region ? 1 : 0) + (filters.dateRange.from || filters.dateRange.to ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </div>
    </Portal>
  );
}
