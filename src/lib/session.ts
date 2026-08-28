import { AUTH_MESSAGES } from '@/lib/authMessages';
import { SESSION_POLICY } from '@/lib/securityConfig';
import { NextResponse } from 'next/server';

// Single source of truth for the session cookies. Every route that opens,
// renews or ends a session goes through the helpers below, so a cookie can
// never be set in one place and forgotten in another — the bug class that let a
// logged-out person keep a live refresh token.

export const AUTH_TOKEN_COOKIE = 'auth_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
/**
 * Records whether "Remember me" was ticked. The refresh route has no other way
 * to know: the refresh token is an opaque backend-issued string, so without
 * this the renewed cookies would silently get the long lifetime and a 24-hour
 * session would become a 30-day one on the first refresh.
 *
 * httpOnly like the rest — it is a session attribute, not a UI preference, and
 * nothing in client JS reads it.
 */
export const SESSION_REMEMBER_COOKIE = 'session_remember';
/**
 * The idle timer, expressed as a cookie that expires on its own.
 *
 * Rather than storing "last seen at" and comparing timestamps, the cookie's own
 * max-age *is* the timeout: it is reissued whenever the person actually does
 * something, so if it is missing, the session has been idle for longer than the
 * policy allows. Nothing has to be persisted server-side, and a clock skew
 * between browser and server cannot extend a session.
 *
 * Deliberately NOT refreshed by `/api/proxy` traffic: background polling
 * (notifications, long-running lookups) would otherwise keep a session alive on
 * an unattended screen forever. Only real input refreshes it — see
 * `/api/auth/heartbeat` and the page-navigation touch in the middleware.
 */
export const SESSION_ACTIVITY_COOKIE = 'session_activity';

/** Long-lived session ("Remember me" ticked). Mirrors the backend refresh-token expiry. */
export const REMEMBERED_SESSION_MAX_AGE = SESSION_POLICY.rememberMeMaxAgeSeconds;
/** Default session lifetime. Mirrors the backend's non-remembered refresh-token expiry. */
export const DEFAULT_SESSION_MAX_AGE = SESSION_POLICY.defaultMaxAgeSeconds;

export function sessionMaxAge(rememberMe: boolean): number {
  return rememberMe ? REMEMBERED_SESSION_MAX_AGE : DEFAULT_SESSION_MAX_AGE;
}

// `strict` rather than `lax`: this is a financial application, and `lax` still
// attaches the cookies to top-level cross-site navigations, which is enough for
// an attacker-controlled link to drive an authenticated GET. The cost is that
// arriving from an external link (an email, a chat message) lands on the login
// page for one navigation — accepted deliberately.
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

interface SessionCookies {
  token?: string | undefined;
  refreshToken?: string | undefined;
  rememberMe: boolean;
}

/**
 * Writes the session cookies onto `response`.
 *
 * Both token cookies carry the *session* lifetime, not the access token's own
 * 15-minute expiry — that is enforced inside the JWT and by the backend, while
 * the cookie is only the container. Keeping them on the same clock means
 * "auth_token present" reliably signals an intended-alive session, which the
 * routing guard depends on.
 */
export function setSessionCookies(
  response: NextResponse,
  { token, refreshToken, rememberMe }: SessionCookies
): void {
  const maxAge = sessionMaxAge(rememberMe);

  if (token) {
    response.cookies.set(AUTH_TOKEN_COOKIE, token, { ...sessionCookieOptions, maxAge });
  }
  if (refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, { ...sessionCookieOptions, maxAge });
  }
  response.cookies.set(SESSION_REMEMBER_COOKIE, rememberMe ? '1' : '0', {
    ...sessionCookieOptions,
    maxAge,
  });
  touchActivityCookie(response);
}

/** Restarts the idle timer. Call only in response to genuine activity. */
export function touchActivityCookie(response: NextResponse): void {
  response.cookies.set(SESSION_ACTIVITY_COOKIE, String(Date.now()), {
    ...sessionCookieOptions,
    maxAge: SESSION_POLICY.idleTimeoutSeconds,
  });
}

interface CookieReader {
  cookies: { get(name: string): { value: string } | undefined };
}

/** Reads back the remember-me choice made at login. Defaults to the short session. */
export function readRememberMe(request: CookieReader): boolean {
  return request.cookies.get(SESSION_REMEMBER_COOKIE)?.value === '1';
}

/**
 * True when a session exists but has gone quiet for longer than the idle policy.
 *
 * Absence of the activity cookie only means "idle" when there is a session to
 * be idle *about* — on an anonymous request every cookie is missing, and that
 * is not a timeout.
 */
export function isIdleExpired(request: CookieReader): boolean {
  const hasSession =
    !!request.cookies.get(AUTH_TOKEN_COOKIE)?.value ||
    !!request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  return hasSession && !request.cookies.get(SESSION_ACTIVITY_COOKIE)?.value;
}

/**
 * Expires only the access-token cookie, leaving the refresh token in place.
 *
 * For the case where the access token is unusable but the session behind it is
 * not over: the refresh token is opaque and validated by the backend, so a
 * malformed or stale `auth_token` says nothing about whether it is still good.
 * Clearing both would discard a live session and orphan its backend row.
 */
export function clearAuthTokenCookie(response: NextResponse): void {
  response.cookies.set(AUTH_TOKEN_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
}

/**
 * The 401 an API route returns when the session has gone idle.
 *
 * Every route that reaches the backend has to enforce this, not just the
 * middleware: the middleware only sees page navigations (its matcher excludes
 * `/api`), so an idle tab left open on a rendered page could keep calling the
 * API — for as long as the access token stayed valid — with nothing re-checking
 * the timeout until the next navigation.
 *
 * Cookies are cleared here so the next request is unambiguously signed out.
 * `fetchApi` retries a 401 once through `/api/auth/refresh`, which enforces the
 * same timeout and will refuse, so the client converges on a sign-out rather
 * than looping.
 */
export function idleSessionResponse(): NextResponse {
  const response = NextResponse.json(
    { message: AUTH_MESSAGES.sessionExpired, code: 'SESSION_IDLE' },
    { status: 401 }
  );
  clearSessionCookies(response);
  return response;
}

/**
 * Expires every session cookie.
 *
 * The options must match the ones used to set them (path, sameSite, secure) or
 * the browser treats it as a different cookie and leaves the original in place.
 */
export function clearSessionCookies(response: NextResponse): void {
  const expired = { ...sessionCookieOptions, maxAge: 0 };
  response.cookies.set(AUTH_TOKEN_COOKIE, '', expired);
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', expired);
  response.cookies.set(SESSION_REMEMBER_COOKIE, '', expired);
  response.cookies.set(SESSION_ACTIVITY_COOKIE, '', expired);
}
