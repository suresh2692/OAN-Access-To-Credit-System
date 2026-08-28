import type { CatalogProduct } from '@/types/loan-catalog';

/**
 * One loan product as the dashboard carousel shows it.
 *
 * `id` is the A2C Loan Product name, not the slug: the card links straight to
 * `/discover-loans/apply/[id]`, which is keyed on it.
 */
export interface TopOffer {
  id: string;
  bank: string;
  bank_logo?: string | null | undefined;
  loan_product_name: string;
  max_loan_amount: number;
  interest_rate: number;
  max_tenure_months: number;
}

/** How many offers the carousel holds. */
export const TOP_OFFER_COUNT = 5;

/**
 * How many products to rank before slicing.
 *
 * The catalog is fetched with `sort_by: 'interest_low_high'`, whose primary key
 * is the same as this ranking's, so the best-value winners are always somewhere
 * in the cheapest N. They are not necessarily in the cheapest 5 — a run of
 * products sharing one rate is ordered by name server-side, and this ranking
 * breaks that tie on amount and tenure instead. The buffer has to be wider than
 * the longest run of tied rates for the result to be exact; 50 covers a
 * marketplace of this size with room to spare, and `list_catalog` caps a page
 * at 100 in any case.
 */
export const TOP_OFFER_CANDIDATE_LIMIT = 50;

// A product that does not state a term cannot be claimed to have the best one,
// so a missing value sorts to the bottom of its key rather than to the top.
// Reading a missing rate as 0 would crown the products with the least
// information as the cheapest loans on the platform.
const WORST_RATE = Number.POSITIVE_INFINITY;
const WORST_AMOUNT = Number.NEGATIVE_INFINITY;
const WORST_TENURE = Number.NEGATIVE_INFINITY;

/**
 * Best value, in the order a borrower weighs it: the cheapest money first, then
 * the most of it, then the longest to pay it back.
 *
 * Strict priority rather than a weighted score. There is no honest exchange rate
 * between a percentage point and a birr, so any set of weights would be a number
 * we invented and then presented to farmers as a ranking. Lexicographic ordering
 * is a claim that can be defended out loud: nothing outranks a cheaper rate.
 *
 * `min_interest_rate` and not `max`: it is the headline rate every catalog card
 * shows, so the dashboard ranks products by the same number the farmer will read
 * on them. `name` closes the sort so a fully tied pair cannot reshuffle itself
 * between two loads of the same dashboard.
 */
export function rankTopOffers(
  products: CatalogProduct[],
  count: number = TOP_OFFER_COUNT
): TopOffer[] {
  return [...products]
    .sort((a, b) => {
      const rate = (a.min_interest_rate ?? WORST_RATE) - (b.min_interest_rate ?? WORST_RATE);
      if (rate !== 0) return rate;

      const amount = (b.max_amount ?? WORST_AMOUNT) - (a.max_amount ?? WORST_AMOUNT);
      if (amount !== 0) return amount;

      const tenure = (b.tenure_months ?? WORST_TENURE) - (a.tenure_months ?? WORST_TENURE);
      if (tenure !== 0) return tenure;

      return a.name.localeCompare(b.name);
    })
    .slice(0, count)
    .map((product) => ({
      id: product.name,
      bank: product.bank_name || product.bank,
      bank_logo: product.bank_logo,
      loan_product_name: product.product_name,
      max_loan_amount: product.max_amount ?? 0,
      interest_rate: product.min_interest_rate ?? 0,
      max_tenure_months: product.tenure_months ?? 0,
    }));
}
