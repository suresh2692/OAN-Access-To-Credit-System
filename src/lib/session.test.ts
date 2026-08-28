import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import {
  AUTH_TOKEN_COOKIE,
  clearAuthTokenCookie,
  clearSessionCookies,
  idleSessionResponse,
  isIdleExpired,
  REFRESH_TOKEN_COOKIE,
  SESSION_ACTIVITY_COOKIE,
  SESSION_REMEMBER_COOKIE,
} from './session';

/** Minimal stand-in for the `cookies.get` surface the readers take. */
const requestWithCookies = (cookies: Record<string, string>) => ({
  cookies: {
    get: (name: string) => (name in cookies ? { value: cookies[name] as string } : undefined),
  },
});

/** A cookie is "expired" when the response sets it to an empty value with maxAge 0. */
const isExpired = (response: NextResponse, name: string) => {
  const cookie = response.cookies.get(name);
  return cookie?.value === '' && cookie?.maxAge === 0;
};

describe('isIdleExpired', () => {
  it('is true when a session exists but the activity cookie has lapsed', () => {
    expect(isIdleExpired(requestWithCookies({ [AUTH_TOKEN_COOKIE]: 'jwt' }))).toBe(true);
  });

  it('is false while the activity cookie is still alive', () => {
    const request = requestWithCookies({
      [AUTH_TOKEN_COOKIE]: 'jwt',
      [SESSION_ACTIVITY_COOKIE]: '1755000000000',
    });

    expect(isIdleExpired(request)).toBe(false);
  });

  it('is false for an anonymous request, where every cookie is missing anyway', () => {
    // Absence of the activity cookie only means "idle" when there is a session
    // to be idle about.
    expect(isIdleExpired(requestWithCookies({}))).toBe(false);
  });

  it('counts a refresh-token-only session as a session', () => {
    expect(isIdleExpired(requestWithCookies({ [REFRESH_TOKEN_COOKIE]: 'opaque' }))).toBe(true);
  });
});

describe('idleSessionResponse', () => {
  it('is a 401 that clears every session cookie', () => {
    const response = idleSessionResponse();

    expect(response.status).toBe(401);
    for (const name of [
      AUTH_TOKEN_COOKIE,
      REFRESH_TOKEN_COOKIE,
      SESSION_REMEMBER_COOKIE,
      SESSION_ACTIVITY_COOKIE,
    ]) {
      expect(isExpired(response, name)).toBe(true);
    }
  });

  it('carries a code the client can distinguish from an ordinary auth failure', async () => {
    const body = await idleSessionResponse().json();

    expect(body.code).toBe('SESSION_IDLE');
  });
});

describe('clearAuthTokenCookie', () => {
  it('expires the access token but leaves the refresh token alone', () => {
    // Regression: the middleware used clearSessionCookies here, so a malformed
    // access token destroyed a still-valid refresh token and forced a full
    // re-login instead of letting /api/auth/refresh recover the session.
    const response = NextResponse.next();
    clearAuthTokenCookie(response);

    expect(isExpired(response, AUTH_TOKEN_COOKIE)).toBe(true);
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)).toBeUndefined();
    expect(response.cookies.get(SESSION_REMEMBER_COOKIE)).toBeUndefined();
  });
});

describe('clearSessionCookies', () => {
  it('expires all four cookies', () => {
    const response = NextResponse.next();
    clearSessionCookies(response);

    for (const name of [
      AUTH_TOKEN_COOKIE,
      REFRESH_TOKEN_COOKIE,
      SESSION_REMEMBER_COOKIE,
      SESSION_ACTIVITY_COOKIE,
    ]) {
      expect(isExpired(response, name)).toBe(true);
    }
  });
});
