import type { CatalogProduct } from '@/types/loan-catalog';
import { describe, expect, it } from 'vitest';
import { rankTopOffers, TOP_OFFER_COUNT } from './topOffers';

function product(name: string, overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    name,
    product_name: `${name} Loan`,
    slug: name.toLowerCase(),
    bank: 'BANK-1',
    bank_name: 'Bank One',
    min_interest_rate: 10,
    max_amount: 100_000,
    tenure_months: 12,
    ...overrides,
  };
}

const names = (products: CatalogProduct[]) => rankTopOffers(products).map((o) => o.id);

describe('rankTopOffers', () => {
  it('puts the cheapest rate first', () => {
    const ranked = names([
      product('dear', { min_interest_rate: 18 }),
      product('cheap', { min_interest_rate: 6 }),
      product('mid', { min_interest_rate: 11 }),
    ]);

    expect(ranked).toEqual(['cheap', 'mid', 'dear']);
  });

  it('breaks a tied rate on the larger amount', () => {
    const ranked = names([
      product('small', { min_interest_rate: 9, max_amount: 50_000 }),
      product('big', { min_interest_rate: 9, max_amount: 400_000 }),
    ]);

    expect(ranked).toEqual(['big', 'small']);
  });

  it('breaks a tied rate and amount on the longer tenure', () => {
    const ranked = names([
      product('short', { min_interest_rate: 9, max_amount: 100_000, tenure_months: 6 }),
      product('long', { min_interest_rate: 9, max_amount: 100_000, tenure_months: 36 }),
    ]);

    expect(ranked).toEqual(['long', 'short']);
  });

  it('never lets a cheaper rate be outranked by a bigger amount', () => {
    // The point of ranking in strict priority rather than scoring: no amount of
    // headroom buys a product past a rival that costs less to borrow.
    const ranked = names([
      product('huge-but-dear', { min_interest_rate: 22, max_amount: 10_000_000 }),
      product('modest-but-cheap', { min_interest_rate: 7, max_amount: 20_000 }),
    ]);

    expect(ranked[0]).toBe('modest-but-cheap');
  });

  it('orders a total tie by name, so the carousel does not reshuffle itself', () => {
    const tied = [product('b'), product('a'), product('c')];

    expect(names(tied)).toEqual(['a', 'b', 'c']);
    expect(names([...tied].reverse())).toEqual(['a', 'b', 'c']);
  });

  it('sinks a product that does not state its rate rather than crowning it', () => {
    // A missing rate read as 0 would make the products carrying the least
    // information look like the cheapest loans on the platform. Built by hand
    // rather than overridden to undefined: exactOptionalPropertyTypes treats an
    // absent key and an undefined one as different types, and absent is what a
    // catalog row with no rate actually looks like.
    const unknownRate: CatalogProduct = {
      name: 'unknown-rate',
      product_name: 'Unknown Rate Loan',
      slug: 'unknown-rate',
      bank: 'BANK-1',
      bank_name: 'Bank One',
      max_amount: 100_000,
      tenure_months: 12,
    };

    const ranked = names([unknownRate, product('stated', { min_interest_rate: 14 })]);

    expect(ranked).toEqual(['stated', 'unknown-rate']);
  });

  it('holds to the carousel size', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      product(`p${i}`, { min_interest_rate: i })
    );

    expect(rankTopOffers(many)).toHaveLength(TOP_OFFER_COUNT);
  });

  it('does not reorder the array it was handed', () => {
    const products = [product('z', { min_interest_rate: 20 }), product('a', { min_interest_rate: 2 })];
    rankTopOffers(products);

    expect(products.map((p) => p.name)).toEqual(['z', 'a']);
  });

  it('prefers the bank display name and falls back to its id', () => {
    const [named, unnamed] = rankTopOffers([
      product('named', { min_interest_rate: 1, bank_name: 'Awash Bank' }),
      product('unnamed', { min_interest_rate: 2, bank: 'BANK-7', bank_name: '' }),
    ]);

    expect(named?.bank).toBe('Awash Bank');
    expect(unnamed?.bank).toBe('BANK-7');
  });

  it('maps the product id through as the offer id, since the card links on it', () => {
    const [offer] = rankTopOffers([product('LP-00042')]);

    expect(offer?.id).toBe('LP-00042');
  });

  it('has nothing to rank when the catalog is empty', () => {
    expect(rankTopOffers([])).toEqual([]);
  });
});
