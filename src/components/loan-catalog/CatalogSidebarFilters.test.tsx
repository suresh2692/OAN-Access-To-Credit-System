import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CatalogFacets, CatalogFilters } from '@/types/loan-catalog';
import CatalogSidebarFilters from './CatalogSidebarFilters';

const FACETS: CatalogFacets = {
  categories: [
    { id: 'input-loan', name: 'Input Loan', count: 3 },
    { id: 'equipment-loan', name: 'Equipment Loan', count: 1 },
  ],
  tenures: [6, 12],
  amount_range: { min: 1000, max: 50000 },
  max_interest_rate: 18,
};

/** A farmer's panel — the only one that offers bookmarks. */
function renderSidebar(
  overrides: Partial<React.ComponentProps<typeof CatalogSidebarFilters>> = {}
) {
  const onApply = vi.fn();
  const onReset = vi.fn();
  render(
    <CatalogSidebarFilters
      facets={FACETS}
      filters={{}}
      onApply={onApply}
      onReset={onReset}
      showBookmarkFilter
      {...overrides}
    />
  );
  return { onApply, onReset };
}

const bookmarkBox = () => screen.getByLabelText(/bookmarked only/i);
const queryBookmarkBox = () => screen.queryByLabelText(/bookmarked only/i);

describe('CatalogSidebarFilters — bookmarked-only filter', () => {
  it('applies is_saved when the box is ticked', () => {
    const { onApply } = renderSidebar();

    fireEvent.click(bookmarkBox());
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith({ is_saved: true });
  });

  it('does not apply anything until the farmer commits', () => {
    // The sidebar is a draft form; a tick on its own must not refetch. Applying
    // on change would make the bookmark box behave unlike every other control
    // in the panel.
    const { onApply } = renderSidebar();

    fireEvent.click(bookmarkBox());

    expect(onApply).not.toHaveBeenCalled();
  });

  it('deletes the key rather than sending is_saved: false when unticked', () => {
    // `is_saved=0` on the wire would read as "products I have *not* saved", and
    // an explicit undefined trips exactOptionalPropertyTypes. Absent is the only
    // honest encoding of an unticked box.
    const { onApply } = renderSidebar({ filters: { is_saved: true } });

    expect(bookmarkBox()).toBeChecked();
    fireEvent.click(bookmarkBox());
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    const applied = onApply.mock.calls[0]?.[0] as CatalogFilters;
    expect('is_saved' in applied).toBe(false);
  });

  it('reflects a filter set from outside the panel', () => {
    renderSidebar({ filters: { is_saved: true } });
    expect(bookmarkBox()).toBeChecked();
  });

  it('stays available when the facets request fails', () => {
    // The bookmark filter reads the farmer's saved list, not the catalog's shape,
    // so a facets outage has no bearing on it — and hiding it there would hide
    // the bookmarks exactly when the sidebar is least able to explain why.
    renderSidebar({ facets: null, hasFailed: true });

    expect(bookmarkBox()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
  });

  it('stays available while the facets are still loading', () => {
    renderSidebar({ facets: null });

    expect(bookmarkBox()).toBeInTheDocument();
    expect(screen.getByText(/loading filters/i)).toBeInTheDocument();
  });

  it('stays available when the catalog has no facets to offer', () => {
    renderSidebar({
      facets: { categories: [], tenures: [], amount_range: null, max_interest_rate: null },
    });

    expect(bookmarkBox()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
  });

  it('clears the box on Reset All', () => {
    const { onReset } = renderSidebar({ filters: { is_saved: true } });

    fireEvent.click(screen.getByRole('button', { name: /reset all/i }));

    expect(onReset).toHaveBeenCalled();
    expect(bookmarkBox()).not.toBeChecked();
  });
});

describe('CatalogSidebarFilters — a view without bookmarks', () => {
  it('offers no bookmark filter', () => {
    // The bank portals render this panel over their own products. There is no
    // saved list behind a bank login, so the box could only ever filter the
    // panel down to nothing — and the cards beside it carry no bookmark button
    // to explain what it means.
    renderSidebar({ showBookmarkFilter: false });

    expect(queryBookmarkBox()).not.toBeInTheDocument();
    expect(screen.queryByText('Bookmarks')).not.toBeInTheDocument();
  });

  it('still offers every filter the catalog does support', () => {
    renderSidebar({ showBookmarkFilter: false });

    expect(screen.getByText('Tenure')).toBeInTheDocument();
    expect(screen.getByText('Loan Types')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
  });

  it('drops Apply when it has nothing left to commit', () => {
    // Without the bookmark box, a facet-less catalog leaves the panel with no
    // control at all; a button whose only effect is to apply {} is furniture.
    renderSidebar({
      showBookmarkFilter: false,
      facets: { categories: [], tenures: [], amount_range: null, max_interest_rate: null },
    });

    expect(screen.getByText(/no catalog filters available/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply filters/i })).not.toBeInTheDocument();
  });
});

describe('CatalogSidebarFilters — loan types', () => {
  const inputLoan = () => screen.getByLabelText(/^Input Loan/);
  const equipmentLoan = () => screen.getByLabelText(/^Equipment Loan/);

  it('offers a checkbox per loan type, not a radio group', () => {
    // A farmer wanting either a crop-input loan or an equipment loan had to run
    // the search twice under the old single-select control.
    renderSidebar();

    expect(inputLoan()).toHaveAttribute('type', 'checkbox');
    expect(equipmentLoan()).toHaveAttribute('type', 'checkbox');
  });

  it('applies the ids the endpoint filters on, not the labels the farmer reads', () => {
    // `term_category` stores the A2C Term Category id; sending the display name
    // matches no relationship row and returns an empty catalog.
    const { onApply } = renderSidebar();

    fireEvent.click(inputLoan());
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith({ categories: ['input-loan'] });
  });

  it('keeps both when two are ticked', () => {
    const { onApply } = renderSidebar();

    fireEvent.click(inputLoan());
    fireEvent.click(equipmentLoan());
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    const applied = onApply.mock.calls[0]?.[0] as CatalogFilters;
    expect(applied.categories).toEqual(['input-loan', 'equipment-loan']);
  });

  it('unticks one without disturbing the other', () => {
    const { onApply } = renderSidebar({
      filters: { categories: ['input-loan', 'equipment-loan'] },
    });

    fireEvent.click(inputLoan());
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    const applied = onApply.mock.calls[0]?.[0] as CatalogFilters;
    expect(applied.categories).toEqual(['equipment-loan']);
  });

  it('drops the key rather than sending an empty list when the last box is cleared', () => {
    // An empty array counts as an active filter in the results panel, which
    // would blame the filters for a catalog that is simply unfiltered.
    const { onApply } = renderSidebar({ filters: { categories: ['input-loan'] } });

    fireEvent.click(inputLoan());
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    const applied = onApply.mock.calls[0]?.[0] as CatalogFilters;
    expect('categories' in applied).toBe(false);
  });

  it('reflects a selection made outside the panel', () => {
    renderSidebar({ filters: { categories: ['equipment-loan'] } });

    expect(equipmentLoan()).toBeChecked();
    expect(inputLoan()).not.toBeChecked();
  });

  it('does not apply anything until the farmer commits', () => {
    const { onApply } = renderSidebar();

    fireEvent.click(inputLoan());

    expect(onApply).not.toHaveBeenCalled();
  });
});

describe('CatalogSidebarFilters — bank status filter', () => {
  const STATUS_OPTIONS = [
    { value: 'Active', label: 'Approved' },
    { value: 'Archived', label: 'Archived' },
  ];

  const archivedChip = () => screen.getByRole('button', { name: 'Archived' });

  it('is absent for a farmer, who only ever sees Active products', () => {
    renderSidebar();

    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('applies the raw status the endpoint filters on, not the label', () => {
    // The bank reads "Approved"; A2C Loan Product stores "Active".
    const { onApply } = renderSidebar({ statusOptions: STATUS_OPTIONS });

    fireEvent.click(screen.getByRole('button', { name: 'Approved' }));
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith({ status: 'Active' });
  });

  it('reaches archived products, which the default page leaves out', () => {
    const { onApply } = renderSidebar({ statusOptions: STATUS_OPTIONS });

    fireEvent.click(archivedChip());
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith({ status: 'Archived' });
  });

  it('says where the archived products went', () => {
    // Without this the default page is indistinguishable from the products
    // having been deleted outright.
    renderSidebar({ statusOptions: STATUS_OPTIONS });

    expect(screen.getByText(/archived products are kept out of the default list/i)).toBeInTheDocument();
  });

  it('clears the selection when the chosen chip is clicked again', () => {
    // The only way back to the default without Reset All.
    const { onApply } = renderSidebar({
      statusOptions: STATUS_OPTIONS,
      filters: { status: 'Archived' },
    });

    fireEvent.click(archivedChip());
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    const applied = onApply.mock.calls[0]?.[0] as CatalogFilters;
    expect('status' in applied).toBe(false);
  });

  it('holds one status at a time, since the endpoint takes one', () => {
    const { onApply } = renderSidebar({ statusOptions: STATUS_OPTIONS });

    fireEvent.click(screen.getByRole('button', { name: 'Approved' }));
    fireEvent.click(archivedChip());
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith({ status: 'Archived' });
  });

  it('reflects a status set from outside the panel', () => {
    renderSidebar({ statusOptions: STATUS_OPTIONS, filters: { status: 'Archived' } });

    expect(archivedChip()).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps Apply available for a bank whose catalog offers no facets', () => {
    // A bank with nothing published still needs the one filter that finds what
    // it archived.
    renderSidebar({
      showBookmarkFilter: false,
      statusOptions: STATUS_OPTIONS,
      facets: { categories: [], tenures: [], amount_range: null, max_interest_rate: null },
    });

    expect(archivedChip()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
  });

  it('stays available when the facets request fails', () => {
    renderSidebar({ showBookmarkFilter: false, statusOptions: STATUS_OPTIONS, facets: null, hasFailed: true });

    expect(archivedChip()).toBeInTheDocument();
  });
});
