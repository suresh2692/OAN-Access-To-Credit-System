import { describe, expect, it } from 'vitest';
import { generateTemporaryPassword } from './team.utils';

describe('generateTemporaryPassword', () => {
  it('always satisfies the backend rule for admin-issued passwords', () => {
    // The backend requires 8-64 chars with at least one letter and one digit
    // (_validate_temp_password in api/v1/seller/onboarding.py). A generator that
    // occasionally emits an all-letter string would fail the invite at random.
    for (let i = 0; i < 200; i++) {
      const password = generateTemporaryPassword();

      expect(password.length).toBeGreaterThanOrEqual(8);
      expect(password.length).toBeLessThanOrEqual(64);
      expect(password).toMatch(/[A-Za-z]/);
      expect(password).toMatch(/\d/);
    }
  });

  it('omits glyphs that are ambiguous when read aloud or copied by hand', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateTemporaryPassword()).not.toMatch(/[0O1lI]/);
    }
  });

  it('does not return the same password twice', () => {
    const generated = new Set(Array.from({ length: 100 }, () => generateTemporaryPassword()));

    expect(generated.size).toBe(100);
  });
});
