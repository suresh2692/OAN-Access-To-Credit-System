import { describe, expect, it } from 'vitest';
import { sanitizeNumericValue } from './NumericInput';

describe('NumericInput - sanitizeNumericValue', () => {
  describe('Interest rate restrictions (2 integer digits, 2 decimal digits)', () => {
    const options = { maxIntegerDigits: 2, maxDecimalDigits: 2 };

    it('allows valid 2 integer and 2 decimal inputs', () => {
      expect(sanitizeNumericValue('12.34', options)).toBe('12.34');
      expect(sanitizeNumericValue('99.99', options)).toBe('99.99');
      expect(sanitizeNumericValue('5', options)).toBe('5');
      expect(sanitizeNumericValue('0.5', options)).toBe('0.5');
    });

    it('truncates integer part beyond 2 digits', () => {
      expect(sanitizeNumericValue('123', options)).toBe('12');
      expect(sanitizeNumericValue('100.5', options)).toBe('10.5');
    });

    it('truncates decimal part beyond 2 decimal places', () => {
      expect(sanitizeNumericValue('12.345', options)).toBe('12.34');
      expect(sanitizeNumericValue('0.999', options)).toBe('0.99');
    });

    it('truncates both integer and decimal parts if both exceed bounds', () => {
      expect(sanitizeNumericValue('123.456', options)).toBe('12.45');
    });

    it('strips exponent and sign characters', () => {
      expect(sanitizeNumericValue('1e2', options)).toBe('12');
      expect(sanitizeNumericValue('+15.5', options)).toBe('15.5');
      expect(sanitizeNumericValue('-9.99', options)).toBe('9.99');
    });
  });

  describe('Loan amount restrictions (6 digits, integer only)', () => {
    const options = { maxDigits: 6 };

    it('allows valid loan amounts up to 6 digits', () => {
      expect(sanitizeNumericValue('100000', options)).toBe('100000');
      expect(sanitizeNumericValue('999999', options)).toBe('999999');
      expect(sanitizeNumericValue('500', options)).toBe('500');
    });

    it('truncates amounts exceeding 6 digits', () => {
      expect(sanitizeNumericValue('1000000', options)).toBe('100000');
      expect(sanitizeNumericValue('123456789', options)).toBe('123456');
    });

    it('strips decimals and non-digit characters for integer-only loan amounts', () => {
      expect(sanitizeNumericValue('500.75', options)).toBe('50075');
      expect(sanitizeNumericValue('100.00', options)).toBe('10000');
      expect(sanitizeNumericValue('100,000', options)).toBe('100000');
    });
  });
});
