import { Portal } from '@/components/Portal';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  clearAdvancedFilters,
  selectAdvancedFilters,
  selectLoanTypeOptions,
  setAdvancedFilters,
} from '../store/loanDashboardSlice';
import {
  ALL_AMOUNTS_INDEX,
  loanAmountRange,
  loanAmountRangeIndex,
  LOAN_AMOUNT_RANGES,
  LOAN_FILTER_STATUS_OPTIONS,
  type FilterStatusOption,
} from '../constants/loans.constants';

interface LoanAdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Which statuses this portal can filter on. Defaults to the dev-agent
   * dashboard's list; the bank portals pass their own live pipeline stages,
   * which is the one thing a fixed list can never get right for every tenant.
   * This is the *only* thing that differed between the two copies of this
   * drawer that used to exist.
   */
  statusOptions?: readonly FilterStatusOption[];
}

export default function LoanAdvancedFilters({
  isOpen,
  onClose,
  statusOptions = LOAN_FILTER_STATUS_OPTIONS,
}: LoanAdvancedFiltersProps) {
  const dispatch = useAppDispatch();
  const currentFilters = useAppSelector(selectAdvancedFilters);
  // `loan_type` is free text on the doctype, so there is no enum to render — the
  // options are the values actually seen in the data. The six hardcoded strings
  // that stood here matched no record, so every pick returned an empty table.
  const loanTypeOptions = useAppSelector(selectLoanTypeOptions);

  // Form states
  const [selStatuses, setSelStatuses] = useState<string[]>(currentFilters.status);
  const [tempIndex, setTempIndex] = useState<number>(ALL_AMOUNTS_INDEX);
  const [tempLoanTypes, setTempLoanTypes] = useState<string[]>(currentFilters.type || []);
  const [region, setRegion] = useState(currentFilters.region || '');
  const [dateFrom, setDateFrom] = useState(currentFilters.dateFrom || '');
  const [dateTo, setDateTo] = useState(currentFilters.dateTo || '');
  const [quickDate, setQuickDate] = useState('');
  // Dropdown states
  const [isAmountOpen, setIsAmountOpen] = useState(false);
  const amountRef = useRef<HTMLDivElement>(null);

  const [isLoanTypeOpen, setIsLoanTypeOpen] = useState(false);
  const loanTypeRef = useRef<HTMLDivElement>(null);

  // Sync state when opened — this panel stays mounted while closed (isOpen
  // just gates the portal render below), so its local editable copy of the
  // filters must be resynced here on reopen rather than via unmount/remount.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelStatuses(currentFilters.status);
      setRegion(currentFilters.region);
      setDateFrom(currentFilters.dateFrom);
      setDateTo(currentFilters.dateTo);
      setTempLoanTypes(currentFilters.type || []);
      setTempIndex(loanAmountRangeIndex(currentFilters.minLoan, currentFilters.maxLoan));

      // Removed automatic date setting to 'Today'
      setQuickDate((q) => (currentFilters.dateFrom || currentFilters.dateTo ? '' : q));
    }
  }, [isOpen, currentFilters]);

  // Click outside handlers
  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (amountRef.current && !amountRef.current.contains(e.target as Node)) setIsAmountOpen(false);
      if (loanTypeRef.current && !loanTypeRef.current.contains(e.target as Node)) setIsLoanTypeOpen(false);
    }
    if (isAmountOpen || isLoanTypeOpen) document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [isAmountOpen, isLoanTypeOpen]);

  const selectedAmountSummary = useMemo(() => {
    if (tempIndex === ALL_AMOUNTS_INDEX) return '';
    return loanAmountRange(tempIndex).display;
  }, [tempIndex]);

  const dialogRef = useModalA11y<HTMLElement>(isOpen, onClose);

  if (!isOpen) return null;

  const toggleStatus = (s: string) => setSelStatuses(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleApply = () => {
    // Filter values only — the sort lives in the same slice object but this drawer
    // has no sort control, and passing the whole object used to reset it on Apply.
    dispatch(setAdvancedFilters({
      status: selStatuses,
      minLoan: loanAmountRange(tempIndex).min,
      maxLoan: loanAmountRange(tempIndex).max,
      type: tempLoanTypes,
      region,
      dateFrom,
      dateTo,
    }));
    onClose();
  };

  const handleReset = () => {
    setSelStatuses([]);
    setTempIndex(ALL_AMOUNTS_INDEX);
    setTempLoanTypes([]);
    setRegion('');
    setDateFrom('');
    setDateTo('');
    setQuickDate('');
    // Clear the applied filters in the store too, so the table refreshes
    // immediately rather than waiting for a separate Apply.
    dispatch(clearAdvancedFilters());
  };

  // ALL_AMOUNTS_INDEX is "All Amounts" — i.e. no amount filter. Comparing against
  // the last real bucket instead counted "All Amounts" as an active filter and left
  // the last real range uncounted.
  const activeCount =
    selStatuses.length +
    (tempIndex !== ALL_AMOUNTS_INDEX ? 1 : 0) +
    (tempLoanTypes.length > 0 ? 1 : 0) +
    (region ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);

  const sidebarContent = (
    <div className="fixed inset-0 z-[9999] flex justify-end font-sans">
      <div
        className="absolute inset-0 bg-black/25 transition-opacity"
        onClick={onClose}
      />

      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Advanced Filters"
        tabIndex={-1}
        className="relative w-full max-w-[540px] bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 ">
          <div className="flex items-center gap-2.5 ">
            <SlidersHorizontal size={20} className="text-[#232F34]" strokeWidth={2} />
            <h3 className="text-lg font-semibold text-[#232F34]">Advanced Filters</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">

          {/* Status */}
          <section>
            <p className="mb-3 text-base font-semibold text-[#232F34]">Status</p>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map(opt => {
                const sel = selStatuses.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    role="button"
                    tabIndex={0}
                    aria-pressed={sel}
                    onClick={() => toggleStatus(opt.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleStatus(opt.value);
                      }
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2 ${sel ? 'border-[#16A34A] bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${sel ? 'border-[#16A34A] bg-[#16A34A]' : 'border-gray-300 bg-white'}`}>
                        {sel && <Check size={12} strokeWidth={3} className="text-white" />}
                      </div>
                      <span className={`text-base font-medium ${sel ? 'text-[#10883c]' : 'text-[#232F34]'}`}>{opt.label}</span>
                    </div>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${opt.dot}`} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Loan Amount */}
          <section ref={amountRef} className="relative">
            <p className="mb-3 text-base font-semibold text-[#232F34]">Loan Amount</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAmountOpen(prev => !prev)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-1 ${isAmountOpen ? 'border-[#16A34A] bg-white ring-2 ring-[#16A34A]/15' : 'border-gray-200 bg-white hover:border-[#16A34A]/50'}`}
              >
                <span className={selectedAmountSummary ? 'text-[#232F34] font-medium' : 'text-[#8E9AA0]'}>
                  {selectedAmountSummary || 'Select Loan Amount'}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isAmountOpen ? 'rotate-180 text-[#16A34A]' : ''}`} />
              </button>

              {isAmountOpen && (
                <div
                  className="absolute left-0 right-0 z-30 mt-1 rounded-b-lg border border-gray-200 bg-white shadow-xl flex flex-col p-4 gap-4"
                  style={{ boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05), 0px 1px 3px rgba(0, 0, 0, 0.07), 0px 1px 2px rgba(0, 0, 0, 0.06)' }}
                >
                  <div className="flex flex-col gap-6 px-2 pt-4 pb-2">
                    {/* Slider UI */}
                    <div className="relative w-full">
                      <div className="h-3 w-full bg-[#D1D5DB] rounded-full relative">
                        <div
                          className="absolute left-0 top-0 h-full bg-[#16A34A] rounded-full"
                          style={{ width: `${(tempIndex / ALL_AMOUNTS_INDEX) * 100}%` }}
                        />
                        <input
                          type="range"
                          min="0"
                          max={ALL_AMOUNTS_INDEX}
                          step="1"
                          value={tempIndex}
                          onChange={e => setTempIndex(Number(e.target.value))}
                          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div
                          className="absolute w-7 h-7 bg-white border-[4px] border-[#16A34A] rounded-full -top-2 -ml-3.5 pointer-events-none transition-all shadow-sm"
                          style={{ left: `${(tempIndex / ALL_AMOUNTS_INDEX) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Labels and Pill */}
                    <div className="flex items-center justify-between relative">
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-[10px] font-bold text-gray-500 tracking-wide">ETB</span>
                        <span className="text-sm font-bold text-gray-700">0</span>
                      </div>

                      <div className="absolute left-1/2 -translate-x-1/2 bg-[#D1FAE5] border border-[#A7F3D0] px-3 py-1.5 rounded-lg flex items-center justify-center min-w-[120px]">
                        <span className="text-[13px] font-bold text-[#16A34A]">
                          {loanAmountRange(tempIndex).display}
                        </span>
                      </div>

                      <div className="flex flex-col items-end leading-tight">
                        <span className="text-[10px] font-bold text-gray-500 tracking-wide">ETB</span>
                        {/* The top bucket has no ceiling, so the scale can't claim one. */}
                        <span className="text-sm font-bold text-gray-700">100,000+</span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-t border-[#F3F3F3] -mx-4" />

                  <div className="flex flex-col -mx-4 -mb-4">
                    {LOAN_AMOUNT_RANGES.slice(0, ALL_AMOUNTS_INDEX).map((opt, idx) => {
                      const isSel = tempIndex === idx;
                      return (
                        <div
                          key={opt.label}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSel}
                          onClick={() => setTempIndex(isSel ? ALL_AMOUNTS_INDEX : idx)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setTempIndex(isSel ? ALL_AMOUNTS_INDEX : idx);
                            }
                          }}
                          className="flex items-center gap-4 py-4 px-6 border-b border-[#F3F3F3] last:border-0 hover:bg-slate-50 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-inset"
                        >
                          <div className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 transition-all ${isSel ? 'border-[#16A34A] bg-[#16A34A]' : 'border-gray-400 bg-white'}`}>
                            {isSel && <Check size={14} strokeWidth={4} className="text-white" />}
                          </div>
                          <span className="text-[15px] font-medium text-[#4B5563] tracking-wide">{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Loan Type */}
          <section ref={loanTypeRef} className="relative">
            <p className="mb-3 text-base font-semibold text-[#232F34]">Loan Type</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLoanTypeOpen(prev => !prev)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-1 ${isLoanTypeOpen ? 'border-[#16A34A] bg-white ring-2 ring-[#16A34A]/15' : 'border-[#EDEFF1] bg-white hover:border-[#16A34A]/50'}`}
              >
                <span className={tempLoanTypes.length > 0 ? 'text-[#232F34] font-medium' : 'text-[#8E9AA0]'}>
                  {tempLoanTypes.length > 0 ? `${tempLoanTypes.length} Selected` : 'Select Loan Type'}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isLoanTypeOpen ? 'rotate-180 text-[#16A34A]' : ''}`} />
              </button>

              {isLoanTypeOpen && (
                <div className="absolute left-0 right-0 z-30 mt-1 rounded-b-lg border border-gray-200 bg-white shadow-xl flex flex-col">
                  <div className="flex flex-col">
                    {loanTypeOptions.length === 0 ? (
                      <p className="px-6 py-4 text-[13px] text-[#8E9AA0]">
                        No loan types seen yet — they appear as applications load.
                      </p>
                    ) : loanTypeOptions.map((opt, idx) => {
                      const isSel = tempLoanTypes.includes(opt);
                      return (
                        <div
                          key={opt}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSel}
                          onClick={() => setTempLoanTypes(prev => isSel ? prev.filter(x => x !== opt) : [...prev, opt])}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setTempLoanTypes(prev => isSel ? prev.filter(x => x !== opt) : [...prev, opt]);
                            }
                          }}
                          className={`flex items-center gap-4 py-4 px-6 border-b border-[#F3F3F3] last:border-0 hover:bg-slate-50 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-inset ${idx === loanTypeOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                        >
                          <div className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 transition-all ${isSel ? 'border-[#16A34A] bg-[#16A34A]' : 'border-gray-400 bg-white'}`}>
                            {isSel && <Check size={14} strokeWidth={4} className="text-white" />}
                          </div>
                          <span className="text-[15px] font-medium text-[#4B5563] tracking-wide">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Region */}
          <section>
            <p className="mb-3 text-base font-semibold text-[#232F34]">Region</p>
            <div className="relative">
              <input
                type="text"
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder="Enter Region"
                className="w-full rounded-md border border-[#EDEFF1] bg-white py-3 px-4 text-[16px] md:text-sm text-[#232F34] placeholder:text-[#8E9AA0] focus:border-[#16A34A] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 shadow-sm"
              />
              {/* One field, and it says which one. It used to invite "Region, Woreda
                  or Kebele" and send the lot as a `location` param that matches no
                  column on A2C Loan Application — a 500 rather than a filter. */}
              <p className="mt-2 text-[13px] text-[#8E9AA0]">Matched from the start of the region name.</p>
            </div>
          </section>

          {/* Date Range */}
          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            quickDate={quickDate}
            onDateFromChange={(v) => { setDateFrom(v); setQuickDate(''); }}
            onDateToChange={(v) => { setDateTo(v); setQuickDate(''); }}
            onQuickDateChange={(label, from, to) => { setQuickDate(label); setDateFrom(from); setDateTo(to); }}
          />

        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-300 px-5 py-6 bg-gray-100 font-bold font-semibold">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-4 mb-3 text-base font-semibold text-[#232F34] transition hover:bg-slate-50"
          >
            <span className='font-semibold'>Reset Filters</span>
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] mb-3 py-3 text-sm font-semibold text-white transition hover:bg-[#10883c]"
          >
            <span className='font-semibold'>Apply Filters</span>
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-xs">
                {activeCount}
              </span>
            )}
          </button>
        </div>

      </aside>
    </div>
  );

  return <Portal>{sidebarContent}</Portal>;
}
