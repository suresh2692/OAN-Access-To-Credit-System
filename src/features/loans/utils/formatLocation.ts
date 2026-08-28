import type { LoanApplicationSummary } from '@/features/loans/api/loan.service';

/**
 * "Region · Woreda", skipping whichever levels the record has not reached yet.
 *
 * Two levels on purpose. `kebele` comes back on the summary as well, but this feeds
 * a table cell that reads as a short place name rather than the full hierarchy — so
 * the third level is left out deliberately here, in one place, instead of looking
 * like an oversight repeated in two copies of the same function.
 */
export function formatLocation(row: LoanApplicationSummary): string {
  return [row.region, row.woreda].filter(Boolean).join(' · ');
}
