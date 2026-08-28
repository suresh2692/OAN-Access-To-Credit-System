import { NextResponse } from 'next/server';

// Fixed-window rate limiter for the authentication routes.
//
// Scope: this is the BFF's own guard, not a replacement for the backend's.
// `oan_a2c.api.auth` already rate-limits per IP in Redis; this stops the abuse
// one hop earlier so a brute-force run never reaches the bench at all, and it
// covers the routes that never touch the backend on the hot path.
//
// State lives in this process's memory, which is exactly right for the deployed
// topology (a single Next container per environment) and degrades gracefully if
// that ever changes: with N replicas the effective limit becomes N x limit,
// still bounded, and the backend's shared Redis counter remains the hard stop.
// Memory is bounded by the sweep below, so a flood of distinct IPs cannot grow
// the map without limit.

interface Window {
  count: number;
  /** Epoch ms at which this window ends and the count resets. */
  resetAt: number;
}

const windows = new Map<string, Window>();

const SWEEP_INTERVAL_MS = 60_000;
let lastSweptAt = 0;

/** Drops expired windows. Runs at most once a minute, on the request path. */
function sweep(now: number): void {
  if (now - lastSweptAt < SWEEP_INTERVAL_MS) return;
  lastSweptAt = now;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets. Only meaningful when `allowed` is false. */
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const window = windows.get(key);

  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  window.count += 1;

  if (window.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * The 429 every rate-limited route returns.
 *
 * The message is deliberately the same regardless of which limit was hit, so it
 * never reveals whether the address, the credentials or the route itself was
 * the thing being probed.
 */
export function rateLimitedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { message: 'Too many attempts. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

/** Test seam — resets the shared window map between cases. */
export function __resetRateLimitsForTests(): void {
  windows.clear();
  lastSweptAt = 0;
}
