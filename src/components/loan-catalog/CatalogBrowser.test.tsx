import type { CatalogFetcher, CatalogListResponse, CatalogProduct } from '@/types/loan-catalog';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogBrowser from './CatalogBrowser';

vi.mock('@/lib/api/catalogApi', () => ({
  getCatalogFacets: vi.fn(async () => ({
    message: 'ok',
    data: { categories: [], tenures: [], amount_range: null, max_interest_rate: null },
  })),
}));

const PRODUCT: CatalogProduct = {
  name: 'LP-0001',
  product_name: 'Teff Input Loan',
  slug: 'teff-input-loan',
  bank: 'BANK-0001',
};

const page = (products: CatalogProduct[]): CatalogListResponse => ({
  message: 'ok',
  data: { products },
  pagination: { page: 1, limit: 10, total: products.length, total_pages: 1, has_next: false },
});

// Defined once, outside the component: the fetch effect depends on both props,
// so a new identity per render would refetch on its own and the assertions
// below would pass for the wrong reason.
const renderCard = (product: CatalogProduct) => <div key={product.name}>{product.product_name}</div>;

describe('CatalogBrowser — refreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refetches the page it is showing when the token moves', async () => {
    // The bank's product page renders this browser but mutates products through
    // a different endpoint's store, so nothing about a create/edit/archive
    // reaches the browser's own state. The token is the whole bridge: without
    // this refetch the grid keeps showing the pre-mutation catalog until a
    // reload, which is exactly the bug it was added for.
    const fetchProducts = vi.fn<CatalogFetcher>(async () => page([PRODUCT]));

    const { rerender } = render(
      <CatalogBrowser fetchProducts={fetchProducts} renderCard={renderCard} refreshToken={0} />
    );
    await waitFor(() => expect(fetchProducts).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Teff Input Loan')).toBeInTheDocument();

    rerender(
      <CatalogBrowser fetchProducts={fetchProducts} renderCard={renderCard} refreshToken={1} />
    );

    await waitFor(() => expect(fetchProducts).toHaveBeenCalledTimes(2));
  });

  it('does not refetch while the token stands still', async () => {
    // Every unrelated re-render of the host would otherwise cost a request.
    const fetchProducts = vi.fn<CatalogFetcher>(async () => page([PRODUCT]));

    const { rerender } = render(
      <CatalogBrowser fetchProducts={fetchProducts} renderCard={renderCard} refreshToken={3} />
    );
    await waitFor(() => expect(fetchProducts).toHaveBeenCalledTimes(1));

    rerender(
      <CatalogBrowser fetchProducts={fetchProducts} renderCard={renderCard} refreshToken={3} />
    );

    // Nothing to wait for — assert the count has not moved once the re-render
    // has had a chance to flush an effect.
    await Promise.resolve();
    expect(fetchProducts).toHaveBeenCalledTimes(1);
  });
});

describe('CatalogBrowser — bookmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers no bookmark filter to a host that cannot set one', async () => {
    // How the bank portals get here: they render this browser over their own
    // products and pass no onBookmarkToggle, because a bank keeps no saved
    // list. One signal drives both the card control and the sidebar filter, so
    // the two can never disagree about whether this view has bookmarks.
    const fetchProducts = vi.fn<CatalogFetcher>(async () => page([PRODUCT]));

    render(<CatalogBrowser fetchProducts={fetchProducts} renderCard={renderCard} />);
    await waitFor(() => expect(fetchProducts).toHaveBeenCalledTimes(1));

    expect(screen.queryByLabelText(/bookmarked only/i)).not.toBeInTheDocument();
  });

  it('offers it to a host that can', async () => {
    const fetchProducts = vi.fn<CatalogFetcher>(async () => page([PRODUCT]));

    render(
      <CatalogBrowser
        fetchProducts={fetchProducts}
        renderCard={renderCard}
        onBookmarkToggle={async () => {}}
      />
    );
    await waitFor(() => expect(fetchProducts).toHaveBeenCalledTimes(1));

    expect(screen.getByLabelText(/bookmarked only/i)).toBeInTheDocument();
  });
});
