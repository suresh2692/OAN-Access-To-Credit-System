// User-facing copy for authentication failures.
//
// These are deliberately uniform. A sign-in response must not reveal which half
// of the pair was wrong, nor whether the account exists at all — otherwise the
// login form doubles as an account-enumeration oracle: an attacker learns which
// email addresses and phone numbers belong to real team members by reading the
// difference between "no such account" and "wrong password", and can then focus
// a password-guessing run on the ones that are real.
//
// The specific reason is not lost, only redirected: every route that returns one
// of these logs what actually happened server-side first.
export const AUTH_MESSAGES = {
  /** Wrong password, unknown account, disabled account — all indistinguishable. */
  invalidCredentials: 'Incorrect email/phone number or password. Please check your credentials and try again.',
  /** The session could not be renewed; the team member has to sign in again. */
  sessionExpired: 'Your session has expired. Please sign in again.',
  /** The backend was reachable but failed. Nothing about it is the caller's business. */
  signInUnavailable: 'We could not sign you in right now. Please try again shortly.',
  /** Rate limited. Same wording whichever limit was hit. */
  tooManyAttempts: 'Too many attempts. Please wait a moment and try again.',
  /** The account is valid but this portal is not the right door for it. */
  wrongPortal: 'These credentials are not valid for this portal. Please use your designated login page.',
  /** Anything unexpected during sign-in that is not covered above. */
  unexpected: 'Something went wrong. Please try again.',
} as const;
