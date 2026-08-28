import type { RawUserResponse } from '@/features/auth/api/authApi';
import { logger } from '@/lib/logger';

// User-facing message for any malformed auth payload. The specific missing
// field is written to the logger (for Sentry/debugging), never surfaced to the
// user — a raw "missing bank_id field" string is meaningless to them.
const AUTH_CONTRACT_ERROR = 'We could not sign you in due to an account setup issue. Please contact support.';

function throwContractViolation(detail: string): never {
  logger.error(`[Auth Contract Violation] ${detail}`);
  throw new Error(AUTH_CONTRACT_ERROR);
}

export type User =
  | { kind: 'bank_admin'; email: string; name: string; bankId: string | null; bankCode: string | null; bankName: string | null; bankStatus: 'In Review' | 'Active' | 'Suspended' | null; userImage?: string | null }
  | { kind: 'bank_agent'; email: string; name: string; bankId: string; bankCode: string; bankName: string; bankStatus: 'In Review' | 'Active' | 'Suspended'; userImage?: string | null }
  | { kind: 'dev_agent'; email: string; name: string; userImage?: string | null }
  | { kind: 'marketplace'; email: string; name: string; userImage?: string | null }
  | { kind: 'farmer'; email: string; name: string; userImage?: string | null };

/**
 * The two ways a correct username/password pair can end.
 *
 * `password_change_required` carries no `user` on purpose: the backend issued no
 * token, so there is no session and nothing to classify. The only thing the UI
 * needs is the login id to hand back to `set_initial_password`.
 */
export type LoginOutcome =
  | { outcome: 'authenticated'; user: User }
  | { outcome: 'password_change_required'; usr: string };

export type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
}

// user_type is authoritative — derived once by the backend at login/get_me,
// not re-derived from roles on the frontend.
export function classifyUser(raw: RawUserResponse): User {
  const {
    email,
    full_name: name,
    user_type,
    bank,
    bank_id: bankId,
    bank_code: bankCode,
    bank_name: bankName,
    bank_status: bankStatus,
  } = raw;
  const resolvedBankName = bankName ?? bank;

  switch (user_type) {
    case 'bank_admin':
      return { kind: 'bank_admin', email, name, bankId: bankId ?? null, bankCode: bankCode ?? null, bankName: resolvedBankName ?? null, bankStatus: bankStatus ?? null };
    case 'bank_agent': {
      const missing = [
        !bankId && 'bank_id',
        !bankCode && 'bank_code',
        !resolvedBankName && 'bank_name',
        !bankStatus && 'bank_status',
      ].filter(Boolean);
      if (missing.length > 0) {
        throwContractViolation(`Bank Agent "${email}" is missing required field(s): ${missing.join(', ')}`);
      }
      return { kind: 'bank_agent', email, name, bankId: bankId!, bankCode: bankCode!, bankName: resolvedBankName!, bankStatus: bankStatus! };
    }
    case 'dev_agent':
      return { kind: 'dev_agent', email, name };
    case 'marketplace':
      return { kind: 'marketplace', email, name };
    case 'farmer':
      return { kind: 'farmer', email, name };
    default:
      throwContractViolation(`Unrecognized user_type from API: ${user_type}`);
  }
}
