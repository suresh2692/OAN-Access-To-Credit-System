'use client';
import { ConnectionError } from '@/components/ConnectionError';
import { Loader2 } from 'lucide-react';
import type { LoanProductSummary } from '@/lib/api/api.schemas';
import type { ReactNode } from 'react';

interface BaseProductListProps {
  header: ReactNode;
  products: LoanProductSummary[];
  isLoading: boolean;
  error?: string | null;
  /** Re-triggers the failed fetch from the ConnectionError retry button. */
  onRetry?: () => void;
  emptyTitle: string;
  emptySubtitle: string;
  renderItem: (product: LoanProductSummary) => ReactNode;
  className?: string;
}

export function BaseProductList({
  header,
  products,
  isLoading,
  error,
  onRetry,
  emptyTitle,
  emptySubtitle,
  renderItem,
  className = "mx-auto w-full space-y-4"
}: BaseProductListProps) {
  return (
    <div className={className}>
      {header}

      {error ? (
        // Matches the app-wide fetch-failure pattern (ConnectionError with Retry),
        // rather than a dead-end inline banner.
        <ConnectionError message={error} {...(onRetry ? { onRetry } : {})} />
      ) : isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading products...
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-[16px] font-semibold text-gray-900">{emptyTitle}</p>
          <p className="mt-2 text-[14px] text-gray-500">
            {emptySubtitle}
          </p>
        </div>
      ) : (
        // A grid, matching Discover Loans: the cards carry a banner image now, so
        // stacking them full-width left most of each row empty.
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map(renderItem)}
        </div>
      )}
    </div>
  );
}
