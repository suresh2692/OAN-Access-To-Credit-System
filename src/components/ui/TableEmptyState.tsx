import { SearchX, Users, X } from 'lucide-react';
import type { ReactNode } from 'react';

interface TableEmptyStateProps {
  /** True when filters/search are active, i.e. rows exist but none match. */
  hasFilters: boolean;
  onClearFilters: () => void;
  /** Must match the host table's column count, or the row won't span it. */
  colSpan: number;
  /** Heading and body for a table that is genuinely empty. */
  emptyTitle: string;
  emptyDescription: string;
  /** Heading when filters are hiding everything — the body text is the same advice in both tables. */
  filteredTitle: string;
  /** Illustration for the empty case. The filtered case always uses SearchX. */
  icon?: ReactNode;
}

/**
 * The "nothing to show" row for every dashboard table.
 *
 * Leads and loans each had their own copy of this. They had already drifted:
 * the loans copy dropped the bouncing dots and swapped the theme tokens for
 * literal hexes (#232F34/#AEB4BA), so the two tables no longer looked alike
 * when empty. One component, tokens kept.
 */
export function TableEmptyState({
  hasFilters,
  onClearFilters,
  colSpan,
  emptyTitle,
  emptyDescription,
  filteredTitle,
  icon,
}: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-slate-100 animate-ping opacity-30" style={{ animationDuration: '2.4s' }} />
            <span className="absolute inset-3 rounded-full bg-slate-100 animate-ping opacity-25" style={{ animationDuration: '2.4s', animationDelay: '0.4s' }} />
            <span className="absolute inset-6 rounded-full bg-slate-100 animate-ping opacity-20" style={{ animationDuration: '2.4s', animationDelay: '0.8s' }} />
            <div
              className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md border border-slate-100"
              style={{ animation: 'float 3s ease-in-out infinite' }}
            >
              <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
              {hasFilters
                ? <SearchX size={36} className="text-slate-400" strokeWidth={1.5} />
                : (icon ?? <Users size={36} className="text-slate-400" strokeWidth={1.5} />)
              }
            </div>
          </div>
          <div className="space-y-1.5 text-center">
            <h3 className="text-lg font-semibold text-text-primary">
              {hasFilters ? filteredTitle : emptyTitle}
            </h3>
            <p className="mx-auto max-w-xs text-sm text-text-muted leading-relaxed">
              {hasFilters
                ? 'Try adjusting or clearing your active filters to see more results.'
                : emptyDescription
              }
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 150, 300].map(delay => (
              <span
                key={delay}
                className={`h-2 w-2 rounded-full animate-bounce ${hasFilters ? 'bg-orange-300' : 'bg-slate-300'}`}
                style={{ animationDelay: `${delay}ms`, animationDuration: '1.2s' }}
              />
            ))}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-green-600 bg-white px-5 py-2.5 text-sm font-medium text-green-700 shadow-sm transition hover:bg-green-50 active:scale-95"
            >
              <X size={14} />
              Clear Filters
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default TableEmptyState;
