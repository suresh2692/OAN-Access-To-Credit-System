// Character set for generated temporary passwords. Deliberately excludes
// look-alike glyphs (0/O, 1/l/I) — these get read aloud or copied by hand from an
// admin to a team member, and "was that a one or an ell?" turns into a support call.
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*?';

const TEMP_PASSWORD_LENGTH = 14;

function pick(pool: string, count: number): string[] {
  const bytes = new Uint32Array(count);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => pool[byte % pool.length]!);
}

/**
 * Builds a temporary password that satisfies the backend rule for admin-issued
 * passwords (8–64 chars, at least one letter and one digit).
 *
 * Exists so admins stop typing `Password123` into the invite form: the value is
 * shared out-of-band and is valid for exactly one sign-in, but until the member
 * rotates it, it is a working credential to their account.
 */
export function generateTemporaryPassword(): string {
  const required = [...pick(LETTERS, 1), ...pick(DIGITS, 1), ...pick(SYMBOLS, 1)];
  const rest = pick(LETTERS + DIGITS + SYMBOLS, TEMP_PASSWORD_LENGTH - required.length);
  const chars = [...required, ...rest];

  // Fisher-Yates with crypto randomness, so the guaranteed letter/digit/symbol
  // don't always sit in the first three positions.
  const shuffleBytes = new Uint32Array(chars.length);
  crypto.getRandomValues(shuffleBytes);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }

  return chars.join('');
}
