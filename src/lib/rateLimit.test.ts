import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetRateLimitsForTests, checkRateLimit, rateLimitedResponse } from './rateLimit';

beforeEach(() => {
  __resetRateLimitsForTests();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('checkRateLimit', () => {
  it('allows exactly `limit` requests and rejects the next one', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('login:1.1.1.1', 3, 60_000).allowed).toBe(true);
    }

    expect(checkRateLimit('login:1.1.1.1', 3, 60_000).allowed).toBe(false);
  });

  it('keys buckets separately so one address cannot lock out another', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('login:1.1.1.1', 3, 60_000);

    expect(checkRateLimit('login:1.1.1.1', 3, 60_000).allowed).toBe(false);
    expect(checkRateLimit('login:2.2.2.2', 3, 60_000).allowed).toBe(true);
  });

  it('keys by route as well, so hitting the login limit leaves refresh usable', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('login:1.1.1.1', 3, 60_000);

    expect(checkRateLimit('refresh:1.1.1.1', 3, 60_000).allowed).toBe(true);
  });

  it('lets requests through again once the window has passed', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('login:1.1.1.1', 3, 60_000);
    expect(checkRateLimit('login:1.1.1.1', 3, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit('login:1.1.1.1', 3, 60_000).allowed).toBe(true);
  });

  it('reports how long is left on the window', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('login:1.1.1.1', 3, 60_000);
    vi.advanceTimersByTime(20_000);

    const result = checkRateLimit('login:1.1.1.1', 3, 60_000);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(40);
  });

  it('never reports a retry-after of zero while still blocking', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('login:1.1.1.1', 3, 60_000);
    vi.advanceTimersByTime(59_999);

    expect(checkRateLimit('login:1.1.1.1', 3, 60_000).retryAfterSeconds).toBe(1);
  });
});

describe('rateLimitedResponse', () => {
  it('returns a 429 carrying Retry-After', async () => {
    const response = rateLimitedResponse(30);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
  });

  it('says nothing about which limit was hit', async () => {
    const body = await rateLimitedResponse(30).json();

    expect(body.message).toBe('Too many attempts. Please wait a moment and try again.');
  });
});
