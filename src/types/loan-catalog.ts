/**
 * The loan-product catalog, as `api/v1/farmer/catalog.py` describes it.
 *
 * These types live outside any one feature because two portals read the same
 * endpoint: the farmer browses every bank's Active products, and a bank user
 * gets the same payload scoped to their own bank (all statuses). Putting them
 * here is what lets `src/components/loan-catalog` be shared by both without a
 * cross-feature import.
 */

export interface CatalogProduct {
  name: string;
  product_name: string;
  slug: string;
  bank: string;
  bank_name?: string;
  bank_logo?: string | null;
  min_interest_rate?: number;
  max_interest_rate?: number;
  min_amount?: number;
  max_amount?: number;
  tenure_months?: number;
  image?: string | null;
  image_url?: string | null;
  /** The product's own category slug, e.g. `crop-input-loans`. */
  category?: string;
  /** Older shape of the same thing. Read both through `resolveCategory`. */
  categories?: string[];
  /**
   * Approval status, sent to bank callers. Absent for the farmer catalog, which
   * only ever lists Active products — so this is optional rather than the
   * `LoanProductStatus` union, and unrecognised values fall back to a neutral
   * badge rather than being assumed live.
   */
  status?: string;
  /** How many applications the product has attracted. Bank-facing. */
  applications_count?: number;
  /** Whether the calling farmer has bookmarked this product. Sent by the catalog
   *  endpoint so a reload does not reset every card to un-bookmarked. */
  is_saved?: boolean;
}

/**
 * The catalog sends a single `category` slug; earlier responses sent a
 * `categories` array. One reader for both, so a card never has to know which
 * shape it was handed.
 */
export function resolveCategory(product: CatalogProduct): string | undefined {
  return product.category ?? product.categories?.[0];
}

/** @deprecated Name kept for the farmer feature's existing imports. */
export type FarmerLoanProduct = CatalogProduct;

/** Sort keys the catalog endpoint accepts. Kept in step with _SORT_COLUMNS in
 *  api/v1/farmer/catalog.py — anything else is rejected by the schema. */
export type CatalogSortKey =
  | 'product_name'
  | 'interest_low_high'
  | 'interest_high_low'
  | 'amount_low_high'
  | 'amount_high_low'
  | 'tenure_low_high'
  | 'newest';

export interface CatalogCategoryFacet {
  /** The A2C Term Category id, which is what `list_catalog` filters on. Not the
   *  label: `term_category` stores this id, so filtering by the display name
   *  matches nothing and quietly returns an empty catalog. */
  id: string;
  /** The human label, from A2C Term.term_name. Display only. */
  name: string;
  /** How many products carry it. `get_catalog_facets` does not currently send
   *  this, so the sidebar shows a count only where one arrives. */
  count?: number;
}

/** Filter options derived from the live catalog. Every entry is backed by at
 *  least one visible product, so the sidebar can only offer filters that return
 *  something. There is no region facet: a loan product has no region. */
export interface CatalogFacets {
  categories: CatalogCategoryFacet[];
  tenures: number[];
  amount_range: { min: number; max: number } | null;
  max_interest_rate: number | null;
}

/** One selectable approval status, for the bank-side status filter. `value` is
 *  the raw A2C Loan Product status the endpoint filters on; `label` is the
 *  bank's wording for it, which is not always the same (Active reads as
 *  "Approved"). Supplied by the hosting view rather than built here, so the
 *  shared catalog components stay free of seller vocabulary. */
export interface CatalogStatusOption {
  value: string;
  label: string;
}

export interface CatalogFilters {
  /**
   * Approval status to narrow to. Bank-side only: the farmer catalog is pinned
   * to Active server-side and ignores this.
   *
   * Single-valued because `list_catalog` takes one status, which also decides
   * what "no selection" means: the endpoint's own default for a bank user is
   * every status except Archived. Selecting Archived is therefore how a bank
   * reaches its retired products — the sidebar says so, because a default that
   * silently omits a whole category of the bank's own catalog is otherwise
   * indistinguishable from those products having been deleted outright.
   */
  status?: string;
  /** Loan-type ids to keep, as a union: a product matching any of them stays.
   *
   *  A set rather than one value, because the sidebar ticks loan types instead
   *  of picking one. Sent to `list_catalog` as a comma-separated `category`,
   *  which is the multi-value encoding the rest of that API uses. Absent rather
   *  than empty when nothing is ticked — an empty array reads as an active
   *  filter to `hasActiveFilters`, which changes the empty-state wording. */
  categories?: string[];
  /** One exact tenure, sent as both bounds of the endpoint's tenure range.
   *
   *  Single-valued, not a set: `list_catalog` filters tenure as a min/max span, so
   *  a multi-select of non-adjacent tenures cannot be expressed — the span between
   *  them would drag in every tenure the farmer did not tick. */
  tenure_months?: number;
  /** Amount bounds are the farmer's borrowing range, not the product's. The
   *  endpoint keeps any product whose own range overlaps this one. */
  min_amount?: number;
  max_amount?: number;
  /** Ceiling on the headline rate the card displays (min_interest_rate). */
  max_interest_rate?: number;
  /** Restrict the catalog to products this user has bookmarked.
   *
   *  Only ever true or absent. `is_saved=false` on the wire would read as "show
   *  me what I have *not* saved", which is not what an unticked box means — the
   *  key is deleted instead. */
  is_saved?: true;
}

/** Query accepted by `list_catalog`. */
export type CatalogQuery = CatalogFilters & {
  search?: string;
  limit?: number;
  start?: number;
  loan_product?: string;
  sort_by?: CatalogSortKey;
};

/**
 * Response envelopes for the catalog endpoints.
 *
 * Structurally identical to the farmer feature's `PaginatedResponse` /
 * `ApiResponse`, which is deliberate: the farmer code passes its own types
 * around and TypeScript's structural typing lets the two meet without either
 * side importing the other.
 */
export interface CatalogPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
}

export interface CatalogListResponse {
  data: { products: CatalogProduct[] };
  message: string;
  pagination: CatalogPagination;
}

export interface CatalogFacetsResponse {
  data: CatalogFacets;
  message: string;
}

/** The one call shape `CatalogBrowser` needs from whichever feature hosts it. */
export type CatalogFetcher = (params?: CatalogQuery) => Promise<CatalogListResponse>;
