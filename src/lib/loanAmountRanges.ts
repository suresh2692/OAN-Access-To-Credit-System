// ─── Loan amount buckets ──────────────────────────────────────────────────────
/**
 * The amount ranges every loan filter offers, in ETB.
 *
 * One list, because there were three: the table's column filter, the advanced-filters
 * drawer and bankApplicationsSlice each had their own copy, with different labels for
 * the same bucket and — in the table's case — a `display` of 'ETB 350000' on a bucket
 * whose real ceiling was 10,000,000.
 *
 * `max: null` on the top bucket means "no ceiling". The old 10,000,000 cap silently
 * excluded anything larger, and the backend accepts amounts far above it.
 *
 * These live in `lib` rather than in the loans feature because the leads filters
 * need the same buckets, and a feature may not import another feature's internals.
 * The leads drawer kept a fourth copy that still carried the 10,000,000 ceiling —
 * exactly the drift this list exists to prevent.
 */
export const LOAN_AMOUNT_RANGES = [
  { label: '0 - 25,000',          min: 0,      max: 25000,  display: 'ETB 0 - 25,000'        },
  { label: '25,001 - 50,000',     min: 25001,  max: 50000,  display: 'ETB 25,001 - 50,000'   },
  { label: '50,001 - 1,00,000',   min: 50001,  max: 100000, display: 'ETB 50,001 - 1,00,000' },
  { label: '1,00,000 and above',  min: 100001, max: null,   display: 'ETB 100,000+'          },
  { label: 'All Amounts',         min: null,   max: null,   display: 'All Amounts'           },
] as const;

/** The last entry — "All Amounts" — is the no-filter position, not a range. */
export const ALL_AMOUNTS_INDEX = LOAN_AMOUNT_RANGES.length - 1;

export const loanAmountRange = (index: number) =>
  LOAN_AMOUNT_RANGES[index] ?? LOAN_AMOUNT_RANGES[ALL_AMOUNTS_INDEX]!;

/**
 * Which bucket an already-applied min/max pair came from, or ALL_AMOUNTS_INDEX.
 *
 * Derived from the list rather than re-listing the bounds at each call site: the
 * copies that did that had drifted, so reopening a filter could show a different
 * bucket than the one being applied.
 */
export function loanAmountRangeIndex(min: number | null, max: number | null): number {
  const found = LOAN_AMOUNT_RANGES.findIndex((r) => r.min === min && r.max === max);
  return found === -1 ? ALL_AMOUNTS_INDEX : found;
}

/**
 * Just the real buckets' labels.
 *
 * For the multi-select amount filters, which express "all amounts" as every bucket
 * being ticked rather than as a fifth option — so they must not offer the trailing
 * "All Amounts" entry as something to tick.
 */
export const LOAN_AMOUNT_BUCKET_LABELS: readonly string[] = LOAN_AMOUNT_RANGES
  .slice(0, ALL_AMOUNTS_INDEX)
  .map((range) => range.label);

/**
 * The figure at the right-hand end of a bucket slider covering `count` buckets.
 *
 * The top bucket has no ceiling, so the widest selection reads "100,000+". Each of
 * the three sliders used to close its own scale at a flat 1,000,000 — a cap the
 * endpoint does not apply, which made the control claim a limit that did not exist.
 */
export function loanAmountCeilingLabel(count: number): string {
  if (count <= 0) return '0';
  const range = LOAN_AMOUNT_RANGES[count - 1];
  if (!range || range.max === null) return '100,000+';
  return range.max.toLocaleString();
}
