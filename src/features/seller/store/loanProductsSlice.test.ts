import type { AppDispatch, RootState } from '@/store';
import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = {
  listProducts: vi.fn(async () => ({ data: [] })),
  getDashboardStats: vi.fn(async () => ({ data: { total_products: 0 } })),
  createProduct: vi.fn(async () => ({ data: { product_ids: ['LP-0001'] } })),
  updateProduct: vi.fn(async () => ({ data: { product_id: 'LP-0001' } })),
  setProductStatus: vi.fn(async () => ({ data: null })),
  archiveProduct: vi.fn(async () => ({ data: null })),
};

vi.mock('../api/loan-products.service', () => ({
  loanProductsService: service,
  DEFAULT_ARCHIVE_REASON: 'Archived by seller',
  AUTO_APPROVAL_REASON: 'Auto-approved: created or edited by bank admin',
}));

const {
  archiveProduct,
  createProductCompound,
  selectCatalogVersion,
  sellerProductsReducer,
  setProductStatus,
  updateProductCompound,
} = await import('./loanProductsSlice');

/**
 * The bank's loan product page reads `farmer.catalog.list_catalog`, not the
 * `seller.list_products` this slice stores — so `catalogVersion` is what tells
 * that page a mutation happened. One bump per mutation: none and the page keeps
 * showing pre-mutation data, two and one edit costs two catalog requests.
 */
function createTestStore(userKind: string | null) {
  return configureStore({
    reducer: {
      sellerProducts: sellerProductsReducer,
      auth: () => ({ user: userKind ? { kind: userKind } : null }),
    },
  });
}

const versionOf = (store: ReturnType<typeof createTestStore>) =>
  selectCatalogVersion(store.getState() as unknown as RootState);

describe('loanProductsSlice — catalogVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts at zero so the first render is not treated as a mutation', () => {
    expect(versionOf(createTestStore('bank_agent'))).toBe(0);
  });

  it('bumps once when a product is archived', async () => {
    const store = createTestStore('bank_admin');

    await (store.dispatch as AppDispatch)(archiveProduct('LP-0001'));

    expect(versionOf(store)).toBe(1);
  });

  it('bumps once when a product is approved or rejected', async () => {
    const store = createTestStore('bank_admin');

    await (store.dispatch as AppDispatch)(
      setProductStatus({ productId: 'LP-0001', status: 'Rejected', reason: 'Rate too high' })
    );

    expect(versionOf(store)).toBe(1);
  });

  it('bumps once for a bank admin create, not twice for the auto-approval it triggers', async () => {
    // A bank admin's product is published straight to Active, so the create
    // delegates to setProductStatus. Both halves invalidating would refetch the
    // catalog twice for one create.
    const store = createTestStore('bank_admin');

    await (store.dispatch as AppDispatch)(
      createProductCompound({
        payload: { product_name: 'Teff Input Loan', min_interest_rate: 9, max_amount: 50000, tenure_months: 12 },
      })
    );

    expect(service.setProductStatus).toHaveBeenCalledTimes(1);
    expect(versionOf(store)).toBe(1);
  });

  it('bumps once for an agent create, which never reaches auto-approval', async () => {
    const store = createTestStore('bank_agent');

    await (store.dispatch as AppDispatch)(
      createProductCompound({
        payload: { product_name: 'Teff Input Loan', min_interest_rate: 9, max_amount: 50000, tenure_months: 12 },
      })
    );

    expect(service.setProductStatus).not.toHaveBeenCalled();
    expect(versionOf(store)).toBe(1);
  });

  it('bumps once per edit', async () => {
    const store = createTestStore('bank_agent');

    await (store.dispatch as AppDispatch)(
      updateProductCompound({
        payload: {
          product_id: 'LP-0001',
          product_name: 'Teff Input Loan',
          min_interest_rate: 9,
          max_amount: 50000,
          tenure_months: 12,
        },
      })
    );

    expect(versionOf(store)).toBe(1);
  });

  it('leaves the version alone when the mutation fails', async () => {
    // A refetch on a failed archive would redraw the same list and read as
    // though something had changed.
    const store = createTestStore('bank_admin');
    service.archiveProduct.mockRejectedValueOnce(new Error('Permission denied'));

    await (store.dispatch as AppDispatch)(archiveProduct('LP-0001'));

    expect(versionOf(store)).toBe(0);
  });
});
