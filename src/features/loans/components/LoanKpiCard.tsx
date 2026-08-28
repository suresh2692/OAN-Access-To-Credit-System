import { useAppSelector } from '@/store/hooks';
import { LucideIcon } from 'lucide-react';
import React from 'react';
import { selectLiveMetrics } from '../store/loanDashboardSlice';

export interface MetricConfig {
  icon: LucideIcon;
  tone: string;
  label: React.ReactNode;
  /**
   * Archetype bucket. Used only by the fallback card row, for when the caller's
   * pipeline has not resolved — the normal row is one card per stage, and stage
   * labels are defined per bank while this dashboard spans all of them.
   */
  key: 'total' | 'in_transition' | 'completed' | 'cancelled';
}

const TONE_STYLES: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600',
  cyan: 'bg-cyan-100 text-cyan-600',
  green: 'bg-green-100 text-green-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
};

interface KpiCardProps {
  label: React.ReactNode;
  value: string;
  icon: LucideIcon;
  tone: string;
  index?: number;
}

/**
 * The card itself, with no opinion about where its figure came from — so a
 * per-stage card and an archetype-bucket card render identically.
 */
export const KpiCard = React.memo(({ label, value, icon: Icon, tone, index = 0 }: KpiCardProps) => {
  return (
    <article 
      className="group relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-card-rise"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate mb-1 text-base font-medium text-gray-500 transition-colors group-hover:text-gray-700">
            {label}
          </span>
          <strong className="truncate text-[36px] leading-none font-bold text-gray-900 mt-2">
            {value}
          </strong>
        </div>

        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${TONE_STYLES[tone] || TONE_STYLES.blue}`}>
          <Icon size={28} strokeWidth={2} />
        </div>
      </div>
    </article>
  );
});

KpiCard.displayName = 'KpiCard';

interface LoanKpiCardProps {
  cfg: MetricConfig;
  index?: number;
}

/** Archetype-bucket card, wired to the summary rollup. Fallback row only. */
const LoanKpiCard = React.memo(({ cfg, index = 0 }: LoanKpiCardProps) => {
  const liveMetrics = useAppSelector(selectLiveMetrics);
  return (
    <KpiCard
      label={cfg.label}
      value={liveMetrics[cfg.key].value}
      icon={cfg.icon}
      tone={cfg.tone}
      index={index}
    />
  );
});

LoanKpiCard.displayName = 'LoanKpiCard';
export default LoanKpiCard;
