/**
 * Loan term display helpers.
 *
 * The implementations live in `@/lib/format/loanTerms` so the shared catalog
 * card — which now renders the bank's own products as well as the farmer's —
 * can reach them without importing from this feature. Re-exported here so the
 * existing farmer-side call sites keep their short relative import.
 */
export {
  NO_VALUE,
  formatAmount,
  formatRate,
  formatRateRange,
  formatTenure,
} from '@/lib/format/loanTerms';
