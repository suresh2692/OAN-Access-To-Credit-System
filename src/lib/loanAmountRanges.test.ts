import { describe, expect, it } from 'vitest';
import {
  ALL_AMOUNTS_INDEX,
  LOAN_AMOUNT_BUCKET_LABELS,
  LOAN_AMOUNT_RANGES,
  loanAmountCeilingLabel,
  loanAmountRange,
  loanAmountRangeIndex,
} from './loanAmountRanges';

describe('loan amount buckets', () => {
  it('leaves the top bucket open-ended', () => {
    // The regression this list exists to prevent: a private copy of these buckets
    // capped "1,00,000 and above" at 10,000,000, so every loan or lead above ten
    // million was silently filtered out by a control that said "and above".
    const topBucket = LOAN_AMOUNT_RANGES[ALL_AMOUNTS_INDEX - 1];
    expect(topBucket?.label).toBe('1,00,000 and above');
    expect(topBucket?.max).toBeNull();
  });

  it('treats the trailing entry as the no-filter position', () => {
    const allAmounts = LOAN_AMOUNT_RANGES[ALL_AMOUNTS_INDEX];
    expect(allAmounts?.min).toBeNull();
    expect(allAmounts?.max).toBeNull();
    expect(LOAN_AMOUNT_BUCKET_LABELS).not.toContain('All Amounts');
    expect(LOAN_AMOUNT_BUCKET_LABELS).toHaveLength(ALL_AMOUNTS_INDEX);
  });

  it('round-trips every bucket through loanAmountRangeIndex', () => {
    // A drawer reopening on the wrong bucket is how the stale 10,000,000 ceiling
    // stayed invisible: the lookup agreed with the copy that applied the filter.
    LOAN_AMOUNT_RANGES.forEach((range, index) => {
      expect(loanAmountRangeIndex(range.min, range.max)).toBe(index);
    });
  });

  it('falls back to All Amounts for bounds that match no bucket', () => {
    expect(loanAmountRangeIndex(100001, 10000000)).toBe(ALL_AMOUNTS_INDEX);
    expect(loanAmountRangeIndex(7, 9)).toBe(ALL_AMOUNTS_INDEX);
  });

  it('clamps an out-of-range slider index to All Amounts', () => {
    expect(loanAmountRange(-1)).toBe(LOAN_AMOUNT_RANGES[ALL_AMOUNTS_INDEX]);
    expect(loanAmountRange(99)).toBe(LOAN_AMOUNT_RANGES[ALL_AMOUNTS_INDEX]);
  });

  it('describes the scale ceiling without inventing a cap', () => {
    expect(loanAmountCeilingLabel(0)).toBe('0');
    expect(loanAmountCeilingLabel(1)).toBe('25,000');
    // The top bucket has no ceiling, so the widest selection must not name a number.
    expect(loanAmountCeilingLabel(ALL_AMOUNTS_INDEX)).toBe('100,000+');
  });
});
