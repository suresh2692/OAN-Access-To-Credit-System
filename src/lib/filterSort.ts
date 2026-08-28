/**
 * The sort half of a dashboard's advanced-filter state.
 *
 * The leads and loans tables sort server-side on the same two columns, so the shape
 * is shared even though each feature keeps its own filter type.
 */
export interface SortState {
  sortBy?: 'loan_amount' | 'creation' | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

/**
 * Replaces the filter values while carrying the current sort over.
 *
 * The advanced-filter drawers have no sort control, so their payload must not be
 * allowed to decide the sort. Apply built an object literal with no
 * `sortBy`/`sortOrder` and the reducer assigned it wholesale, which silently reset
 * the table to "newest first" — the column header the user had just clicked kept its
 * arrow while the rows underneath came back in a different order.
 *
 * Written as an explicit merge rather than a spread because
 * `exactOptionalPropertyTypes` rejects handing an optional field an explicit
 * `undefined`.
 */
export function withCurrentSort<F extends SortState>(values: Omit<F, keyof SortState>, current: F): F {
  const sort: SortState = {};
  if (current.sortBy !== undefined) sort.sortBy = current.sortBy;
  if (current.sortOrder !== undefined) sort.sortOrder = current.sortOrder;
  // `Omit<F, keyof SortState>` plus the two sort fields is `F`, but that is not
  // something TypeScript can see through a generic — asserted once here rather than
  // at each call site.
  return { ...values, ...sort } as F;
}
