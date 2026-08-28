'use client';

import { AccessDenied } from '@/components/AccessDenied';
import { ConnectionError } from '@/components/ConnectionError';
import {
    fetchLoanStages,
    fetchLoans,
    fetchLoanSummary, selectIsLoansLoading, selectLiveMetrics, selectLoanStageCards, selectLoansError, selectQueryParams, selectTotalCount
} from '@/features/loans/store/loanDashboardSlice';
import { getStageCardIcon } from '@/features/loans/utils/stageIcons';
import { ApiErrorCode, classifyError } from '@/lib/api/apiErrors';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useCallback, useEffect, useState } from 'react';

import LoanDashboardHeader from '@/features/loans/components/LoanDashboardHeader';
import LoanKpiCard, { KpiCard, MetricConfig } from '@/features/loans/components/LoanKpiCard';
import LoanPagination from '@/features/loans/components/LoanPagination';
import LoanTable, { LoanTableRow } from '@/features/loans/components/LoanTable';
import LoanToolbar from '@/features/loans/components/LoanToolbar';
import { Award, FileText, Users, XCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

const LoanApplicationModal = dynamic(() => import('@/features/loans/components/modals/LoanApplicationModalLegacy'), {
  ssr: false,
});

// Fallback row, shown only until the caller's pipeline resolves (or if it comes
// back empty). The real row is one card per stage — see `selectLoanStageCards`.
// Labelled by archetype rather than outcome, because an archetype is the only
// thing that means the same across the banks this dashboard spans.
const METRIC_CONFIG: MetricConfig[] = [
  { key: 'total', label: <span className="font-medium text-gray-500"><strong className="font-bold text-gray-700">Overall</strong> Applications</span>, icon: Users, tone: 'blue' },
  { key: 'in_transition', label: 'In Progress', icon: FileText, tone: 'cyan' },
  { key: 'completed', label: 'Completed', icon: Award, tone: 'green' },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle, tone: 'red' },
];

export function LoanApplicationDashboardClient() {
  const dispatch = useAppDispatch();
  const queryParams = useAppSelector(selectQueryParams);
  const loansError = useAppSelector(selectLoansError);
  const isLoading = useAppSelector(selectIsLoansLoading);
  const totalCount = useAppSelector(selectTotalCount);
  const stageCards = useAppSelector(selectLoanStageCards);
  const liveMetrics = useAppSelector(selectLiveMetrics);

  const [selectedRow, setSelectedRow] = useState<LoanTableRow | null>(null);

  const loadLoans = useCallback(() => {
    return dispatch(fetchLoans(queryParams));
  }, [dispatch, queryParams]);

  useEffect(() => {
    // Abort the in-flight request when queryParams change (or on unmount) so a
    // slower earlier response can't overwrite the results for a newer query.
    const promise = loadLoans();
    return () => {
      promise.abort();
    };
  }, [loadLoans]);

  useEffect(() => {
    dispatch(fetchLoanSummary());
    // The pipeline itself: what the status filter may offer, and what each KPI
    // card stands for. Without it the dashboard has no vocabulary of its own and
    // falls back to archetype buckets.
    dispatch(fetchLoanStages());
  }, [dispatch]);

  const handleView = useCallback((row: LoanTableRow) => {
    setSelectedRow(row);
  }, []);

  // Same error taxonomy as the leads dashboard: 403 → Access Denied, 5xx /
  // network unreachable (e.g. proxy 502) → retryable connection error. 401 is
  // handled globally by the store middleware (logs out). The connection error
  // only replaces the dashboard when there is nothing already on screen — a
  // failed background refresh keeps the stale table rather than blanking it.
  if (classifyError(loansError) === ApiErrorCode.Forbidden) {
    return <AccessDenied message="You don't have permission to view the loan applications dashboard." />;
  }

  if (loansError && totalCount === 0 && !isLoading) {
    return <ConnectionError onRetry={loadLoans} />;
  }

  return (
    <div className="">
      <LoanDashboardHeader />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {stageCards.length > 0 ? (
          <>
            <KpiCard
              label={<span className="font-medium text-gray-500"><strong className="font-bold text-gray-700">Overall</strong> Applications</span>}
              // The summary's own total, not the list's pagination count — the
              // latter reflects the active filters, so the "Overall" card would
              // shrink every time the user narrowed the table.
              value={liveMetrics.total.value}
              icon={Users}
              tone="blue"
              index={0}
            />
            {stageCards.map((card, index) => {
              const { icon, tone } = getStageCardIcon(card.label, card.archetype);
              return (
                <KpiCard
                  key={card.key}
                  label={card.label}
                  value={card.value.toString()}
                  icon={icon}
                  tone={tone}
                  index={index + 1}
                />
              );
            })}
          </>
        ) : (
          METRIC_CONFIG.map((cfg, index) => (
            <LoanKpiCard key={cfg.key} cfg={cfg} index={index} />
          ))
        )}
      </section>

      <section className="mt-8">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all">
          <LoanToolbar />
          <LoanTable onView={handleView} />
          <LoanPagination />
        </div>
      </section>

      <LoanApplicationModal
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        data={selectedRow}
      />
    </div>
  );
}
