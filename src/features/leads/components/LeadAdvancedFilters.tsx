import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
// eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
import { selectLeadSourcesOptions } from '@/features/new-lead/store/newLeadSlice';
// eslint-disable-next-line boundaries/dependencies -- TODO (2026-08-23): needs to be fixed later; hiding for now as this existed before our changes
import { selectCategories } from '@/features/seller/store/loanProductsSlice';
import { ALL_AMOUNTS_INDEX, LOAN_AMOUNT_RANGES, loanAmountRange, loanAmountRangeIndex } from '@/lib/loanAmountRanges';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Portal } from '@/components/Portal';
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KPI_CARDS_LAYOUT, STATUS_STYLE_MAP } from '../constants/leads.constants';
import { resetFilters, selectAdvFilters, setAdvFilters } from '../store/leadSlice';


// The shared buckets, not a fourth private copy. This drawer kept its own list
// whose top bucket closed at max: 10,000,000, so "1,00,000 and above" quietly
// excluded every lead above ten million — the exact ceiling the shared list was
// created to remove, applied to loans but never carried across to leads.
const RANGE_STEPS = LOAN_AMOUNT_RANGES;

const getRangeStep = (index: number) => loanAmountRange(index);

interface LeadAdvancedFiltersProps {
  onClose: () => void;
}

function LeadAdvancedFilters({ onClose }: LeadAdvancedFiltersProps) {
  const dispatch = useAppDispatch();
  const activeFilters = useAppSelector(selectAdvFilters);
  const leadSourcesOptions = useAppSelector(selectLeadSourcesOptions);
  const loanTypesOptions = useAppSelector(selectCategories).map((c) => c.term_name);

  const [selStatuses, setSelStatuses] = useState<string[]>(() =>
    activeFilters.statuses.map(s => {
      const match = KPI_CARDS_LAYOUT.find(item => item.id.toLowerCase() === s.toLowerCase() || item.label.toLowerCase() === s.toLowerCase());
      return match ? match.label : s;
    })
  );
  const [quickDate, setQuickDate] = useState(activeFilters.quickDate);
  const [dateFrom, setDateFrom] = useState(activeFilters.dateFrom);
  const [dateTo, setDateTo] = useState(activeFilters.dateTo);
  // Removed automatic "Today" date setting so filters are empty by default

  // Region state. One plain text box — see the Region section below for why the
  // level-name dropdown that used to sit here is gone.
  const [region, setRegion] = useState(activeFilters.region || '');

  // Derived from the shared list rather than re-listing the bounds here: this
  // copy still tested `max === 10000000` for the top bucket, so once that bucket
  // became open-ended the drawer would have reopened on "All Amounts" and shown
  // no amount filter at all.
  const getInitialIndex = () => loanAmountRangeIndex(activeFilters.minAmount, activeFilters.maxAmount);

  // Loan Amount states
  const [isAmountOpen, setIsAmountOpen] = useState(false);
  const [tempIndex, setTempIndex] = useState<number>(getInitialIndex);
  const amountRef = useRef<HTMLDivElement>(null);

  // Loan Type states
  const [isLoanTypeOpen, setIsLoanTypeOpen] = useState(false);
  const [tempLoanTypes, setTempLoanTypes] = useState<string[]>(activeFilters.loanType || []);
  const loanTypeRef = useRef<HTMLDivElement>(null);

  // Lead Source states
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [tempSources, setTempSources] = useState<string[]>(activeFilters.leadSources || []);
  const sourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Resyncs this panel's local editable copy whenever the committed Redux
    // filters change externally (e.g. cleared elsewhere) — can't be computed
    // during render since it has to stay independently editable in between.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelStatuses(activeFilters.statuses.map(s => {
      const match = KPI_CARDS_LAYOUT.find(item => item.id.toLowerCase() === s.toLowerCase() || item.label.toLowerCase() === s.toLowerCase());
      return match ? match.label : s;
    }));
    setQuickDate(activeFilters.quickDate);
    setDateFrom(activeFilters.dateFrom);
    setDateTo(activeFilters.dateTo);
    setRegion(activeFilters.region || '');
    setTempIndex(getInitialIndex());
    setTempLoanTypes(activeFilters.loanType || []);
    setTempSources(activeFilters.leadSources || []);
    // getInitialIndex is a closure derived purely from activeFilters (already
    // a dependency); listing it too would just churn on its unstable reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);

  useClickOutside(amountRef, () => setIsAmountOpen(false), isAmountOpen);
  useClickOutside(loanTypeRef, () => setIsLoanTypeOpen(false), isLoanTypeOpen);
  useClickOutside(sourcesRef, () => setIsSourcesOpen(false), isSourcesOpen);

  // This panel is only ever mounted while it should be visible (no isOpen
  // prop — the parent conditionally renders it), so it's always "open" here.
  const dialogRef = useModalA11y<HTMLElement>(true, onClose);

  const toggleStatus = (s: string) => {
    const layoutItem = KPI_CARDS_LAYOUT.find(item => item.id === s);
    const label = layoutItem ? layoutItem.label : s;
    setSelStatuses(p => p.includes(label) ? p.filter(x => x !== label) : [...p, label]);
  };
  const toggleSource = (s: string) => setTempSources(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const selectedAmountSummary = useMemo(() => {
    if (tempIndex === ALL_AMOUNTS_INDEX) return '';
    return getRangeStep(tempIndex).display;
  }, [tempIndex]);

  const activeCount =
    (selStatuses.length > 0 ? 1 : 0) +
    (quickDate || dateFrom ? 1 : 0) +
    (region.trim() ? 1 : 0) +
    (tempIndex !== ALL_AMOUNTS_INDEX ? 1 : 0) +
    (tempLoanTypes.length > 0 ? 1 : 0) +
    (tempSources.length > 0 ? 1 : 0);

  return (
    <Portal>
      <div className="fixed inset-0 z-[9998] bg-black/25" onClick={onClose} />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Advanced Filters"
        tabIndex={-1}
        className="fixed right-0 top-0 z-[9999] flex h-full w-full sm:w-[540px] flex-col bg-white shadow-2xl font-sans">

        {/* header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal size={20} className="text-text-primary" strokeWidth={2} />
            <h3 className="text-lg font-semibold text-text-primary">Advanced Filters</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-text-muted transition hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">

          {/* Status */}
          <section>
            <p className="mb-3 text-base font-semibold text-text-primary">Status</p>
            <div className="grid grid-cols-2 gap-2">
              {KPI_CARDS_LAYOUT.filter(item => item.id !== 'total').map(item => {
                const s = item.id;
                const label = item.label;
                const sel = selStatuses.includes(label);
                const dot = STATUS_STYLE_MAP[label]?.dotClass ?? 'bg-slate-400';
                return (
                  <div
                    key={s}
                    role="button"
                    tabIndex={0}
                    aria-pressed={sel}
                    onClick={() => toggleStatus(s)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleStatus(s);
                      }
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2 ${sel ? 'border-[#16A34A] bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${sel ? 'border-[#16A34A] bg-[#16A34A]' : 'border-gray-300 bg-white'
                        }`}>
                        {sel && <Check size={12} strokeWidth={3} className="text-white" />}
                      </div>
                      <span className={`text-base font-medium ${sel ? 'text-[#10883c]' : 'text-text-primary'}`}>{label}</span>
                    </div>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                  </div>
                );
              })}
            </div>
          </section>



          {/* Loan Amount */}
          <section ref={amountRef} className="relative">
            <p className="mb-3 text-base font-semibold text-text-primary">Loan Amount</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAmountOpen(prev => !prev)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-1 ${isAmountOpen
                  ? 'border-[#16A34A] bg-white ring-2 ring-[#16A34A]/15'
                  : 'border-gray-200 bg-white hover:border-[#16A34A]/50'
                  }`}
              >
                <span className={selectedAmountSummary ? 'text-[#232F34] font-medium' : 'text-[#8E9AA0]'}>
                  {selectedAmountSummary || 'Select Loan Amount'}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isAmountOpen ? 'rotate-180 text-[#16A34A]' : ''}`} />
              </button>

              {isAmountOpen && (
                <div
                  className="absolute left-0 right-0 z-30 mt-1 rounded-b-lg border border-gray-200 bg-white shadow-xl flex flex-col p-4 gap-4"
                  style={{
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05), 0px 1px 3px rgba(0, 0, 0, 0.07), 0px 1px 2px rgba(0, 0, 0, 0.06)'
                  }}
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
                          max="4"
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
                          {getRangeStep(tempIndex).display}
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
                    {RANGE_STEPS.slice(0, ALL_AMOUNTS_INDEX).map((opt, idx) => {
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
            <p className="mb-3 text-base font-semibold text-text-primary">Loan Type</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLoanTypeOpen(prev => !prev)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-1 ${isLoanTypeOpen
                  ? 'border-[#16A34A] bg-white ring-2 ring-[#16A34A]/15'
                  : 'border-[#EDEFF1] bg-white hover:border-[#16A34A]/50'
                  }`}
                style={{
                  boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                <span className={tempLoanTypes.length > 0 ? 'text-[#232F34] font-medium font-sans' : 'text-[#8E9AA0] font-sans'}>
                  {tempLoanTypes.length > 0 ? `${tempLoanTypes.length} Selected` : 'Select Loan Type'}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isLoanTypeOpen ? 'rotate-180 text-[#16A34A]' : ''}`} />
              </button>

              {isLoanTypeOpen && (
                <div
                  className="absolute left-0 right-0 z-30 mt-1 rounded-b-lg border border-gray-200 bg-white shadow-xl flex flex-col"
                  style={{
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05), 0px 1px 3px rgba(0, 0, 0, 0.07), 0px 1px 2px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <div className="flex flex-col">
                    {loanTypesOptions.map((opt, idx) => {
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
                          className={`flex items-center gap-4 py-4 px-6 border-b border-[#F3F3F3] last:border-0 hover:bg-slate-50 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-inset ${idx === loanTypesOptions.length - 1 ? 'rounded-b-lg' : ''
                            }`}
                        >
                          <div className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 transition-all ${isSel
                            ? 'border-[#16A34A] bg-[#16A34A]'
                            : 'border-gray-400 bg-white'
                            }`}>
                            {isSel && <Check size={14} strokeWidth={4} className="text-white" />}
                          </div>
                          <span className="text-[15px] font-medium text-[#4B5563] tracking-wide font-sans">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Lead Source */}
          <section ref={sourcesRef} className="relative">
            <p className="mb-3 text-base font-semibold text-text-primary">Lead Source</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSourcesOpen(prev => !prev)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-1 ${isSourcesOpen
                  ? 'border-[#16A34A] bg-white ring-2 ring-[#16A34A]/15'
                  : 'border-[#EDEFF1] bg-white hover:border-[#16A34A]/50'
                  }`}
                style={{
                  boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                <span className={tempSources.length > 0 ? 'text-[#232F34] font-medium font-sans' : 'text-[#8E9AA0] font-sans'}>
                  {tempSources.length > 0 ? `${tempSources.length} Selected` : 'Select Lead Source'}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isSourcesOpen ? 'rotate-180 text-[#16A34A]' : ''}`} />
              </button>

              {/* Dropdown List */}
              {isSourcesOpen && (
                <div
                  className="absolute left-0 right-0 z-30 mt-1 rounded-b-lg border border-gray-200 bg-white shadow-xl flex flex-col"
                  style={{
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05), 0px 1px 3px rgba(0, 0, 0, 0.07), 0px 1px 2px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <div className="flex flex-col">
                    {leadSourcesOptions.map((opt, idx) => {
                      const isSel = tempSources.includes(opt);
                      return (
                        <div
                          key={opt}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSel}
                          onClick={() => toggleSource(opt)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleSource(opt);
                            }
                          }}
                          className={`flex items-center gap-4 py-4 px-6 border-b border-[#F3F3F3] last:border-0 hover:bg-slate-50 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-inset ${idx === leadSourcesOptions.length - 1 ? 'rounded-b-lg' : ''
                            }`}
                        >
                          <div className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 transition-all ${isSel
                            ? 'border-[#16A34A] bg-[#16A34A]'
                            : 'border-gray-400 bg-white'
                            }`}>
                            {isSel && <Check size={14} strokeWidth={4} className="text-white" />}
                          </div>
                          <span className="text-[15px] font-medium text-[#4B5563] tracking-wide font-sans">{opt}</span>
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
            <p className="mb-3 text-base font-semibold text-text-primary">Region</p>
            <div className="relative">
              <input
                type="text"
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder="Enter Region"
                className="w-full rounded-xl border border-[#EDEFF1] bg-white py-3 px-4 text-sm text-[#232F34] placeholder:text-[#8E9AA0] focus:border-[#16A34A] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 font-sans shadow-sm"
              />
              {/* One field, and it says which one. The dropdown that used to hang off
                  this box offered the strings 'Region', 'Woreda' and 'Kebele' — the
                  names of the levels, not values — so picking one filtered for a lead
                  whose region was literally "Woreda". The value went out appended to
                  `search_query` besides, which only ORs over name/phone/external_id. */}
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
            usePortal={false}
            openUpwards={true}
          />
        </div>

        {/* footer */}
        <div className="flex gap-3 border-t border-gray-300 px-5 py-6 bg-gray-100 font-bold font-semibold">
          <button
            type="button"
            onClick={() => {
              dispatch(resetFilters());
              setSelStatuses([]);

              setDateFrom('');
              setDateTo('');
              setQuickDate('');

              setRegion('');
              setTempIndex(4);
              setTempLoanTypes([]);
              setTempSources([]);
            }}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-4 mb-3 text-base font-semibold text-[#232F34] transition hover:bg-slate-50"
          >
            Reset Filters
          </button>
          <button
            type="button"
            onClick={() => {
              const activeRange = getRangeStep(tempIndex);
              dispatch(setAdvFilters({
                statuses: selStatuses,
                quickDate,
                dateFrom,
                dateTo,
                // Trimmed on the way in, matching the count above (which already
                // used `region.trim()`): a whitespace-only region is matched from
                // the start of the name and empties the table.
                region: region.trim(),
                minAmount: activeRange.min,
                maxAmount: activeRange.max,
                loanType: tempLoanTypes,
                leadSources: tempSources,
              }));
              onClose();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] mb-3 py-3 text-sm font-semibold text-white transition hover:bg-[#10883c]"
          >
            Apply Filters
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-xs">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </aside >
    </Portal >
  );
}

export default LeadAdvancedFilters;
