/**
 * Display helpers for loan terms.
 *
 * One rule, in one place: a term the data does not carry is shown as a dash, not
 * as a zero. `{rate || 0}%` and `{months || 0} mo` were rendering "0%" and "0 mo"
 * for products whose bank had published neither — an absence dressed up as the
 * most attractive offer on the page. Nulls are accepted alongside undefined
 * because the API sends JSON null for an unset field.
 */

/** Shown wherever a value is missing. */
export const NO_VALUE = '—';

export function formatAmount(amount: number | null | undefined): string {
  return amount == null ? NO_VALUE : `ETB ${amount.toLocaleString('en-US')}`;
}

export function formatRate(rate: number | null | undefined): string {
  return rate == null ? NO_VALUE : `${rate}%`;
}

export function formatTenure(months: number | null | undefined): string {
  return months == null ? NO_VALUE : `${months} mo`;
}

/**
 * The headline rate for a card: a span when the bank published both ends, a
 * single figure when it published one.
 *
 * The bank's own catalogue lists `1% - 2.5% p.a.` where the farmer's card shows
 * only the floor, which is the figure the catalog sorts and filters on. Keeping
 * both shapes here means the card does not have to know which caller it is
 * rendering for.
 */
export function formatRateRange(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  if (min == null && max == null) return NO_VALUE;
  if (min != null && max != null && max !== min) return `${min}% - ${max}%`;
  return formatRate(min ?? max);
}
