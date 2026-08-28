import { describe, expect, it } from 'vitest';
import { PASSWORD_RULES, strongPasswordSchema } from './api.schemas';

/**
 * The checklist and the validator are one list now; these hold them to it.
 *
 * The bug this prevents is silent: a rule tightened in the schema but not in the
 * checklist shows every requirement green on a password the form then rejects,
 * with a message pointing at a rule the person believes they met.
 */

const VALID = 'Str0ng!pass';

describe('password policy', () => {
  it('accepts a password that satisfies every rule', () => {
    expect(PASSWORD_RULES.every((rule) => rule.test(VALID))).toBe(true);
    expect(strongPasswordSchema.safeParse(VALID).success).toBe(true);
  });

  it.each(PASSWORD_RULES.map((rule) => rule.label))(
    'rejects a password failing "%s" with that rule\'s message',
    (label) => {
      const rule = PASSWORD_RULES.find((r) => r.label === label)!;
      // A value that fails exactly this rule, found by stripping the class it
      // requires from an otherwise-valid password.
      const failing =
        label === 'At least 8 characters'
          ? 'S1!a'
          : VALID
              .split('')
              .filter((char) => !rule.test(char))
              .join('')
              // Keep it long enough that only the rule under test can fail.
              .padEnd(12, rule.test('a') ? '1' : 'a');

      expect(rule.test(failing)).toBe(false);

      const result = strongPasswordSchema.safeParse(failing);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message)).toContain(rule.message);
      }
    }
  );

  it('reports the first unmet rule first, which is the message forms surface', () => {
    const result = strongPasswordSchema.safeParse('a');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(PASSWORD_RULES[0]?.message);
    }
  });
});
