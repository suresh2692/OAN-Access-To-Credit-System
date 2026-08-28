import { logger } from '@/lib/logger';

// Derives the caller's IP address from a request that reached us through a
// reverse proxy.
//
// `X-Forwarded-For` is a client-writable header: anything a client sends
// arrives at our proxy verbatim, and each hop *appends* its own view of the
// peer. So the chain looks like
//
//     <spoofed by client>, <spoofed by client>, <real IP seen by our edge>
//
// The trustworthy entries are therefore the rightmost ones — one per proxy we
// actually control. Reading the leftmost entry (the common mistake, and what
// Frappe does with whatever we forward it) lets the caller pick its own
// identity, defeating any per-IP rate limit or audit trail built on it.
//
// TRUSTED_PROXY_HOPS is the number of proxies between the internet and this
// process. The default of 1 matches the deployed topology (a single load
// balancer in front of the Next container). Raise it only when another trusted
// hop is actually added.
//
// The safe direction to be wrong is LOW, not high. Each declared hop moves the
// read one position further left, so:
//
//   - Too low  -> we read an entry our own infrastructure appended. Worst case
//                 every caller buckets under the load balancer's address: the
//                 rate limit gets coarser, but no caller can choose its bucket.
//   - Too high -> we read past our infrastructure into the part of the chain the
//                 caller wrote. Someone who knows (or guesses) the setting pads
//                 X-Forwarded-For with enough entries to land the read on a
//                 value they picked, which is exactly the spoof this module
//                 exists to prevent.
//
// So over-declaring is the dangerous mistake. Nothing inside this function can
// detect it — a padded chain is indistinguishable from a long legitimate one —
// which is why the value must match the deployed topology exactly rather than
// being set "generously".
const DEFAULT_TRUSTED_PROXY_HOPS = 1;

// Bound on the configured value. Not a security control by itself (any value
// above the real hop count is already unsafe), just a guard against a typo like
// `TRUSTED_PROXY_HOPS=10` reading ten entries into caller-written territory.
const MAX_TRUSTED_PROXY_HOPS = 4;

/** Sentinel used when no address can be established — still a usable bucket key. */
export const UNKNOWN_CLIENT_IP = 'unknown';

function trustedProxyHops(): number {
  const raw = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? '', 10);
  if (!Number.isInteger(raw) || raw < 1) return DEFAULT_TRUSTED_PROXY_HOPS;
  return Math.min(raw, MAX_TRUSTED_PROXY_HOPS);
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    const chain = forwardedFor
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (chain.length > 0) {
      const hops = trustedProxyHops();

      // Every trusted hop appends exactly one entry, so a correctly configured
      // chain can never be shorter than the hop count. When it is, the declared
      // topology does not match reality and positional arithmetic is meaningless
      // — fall back to the rightmost entry, the only one whose provenance is
      // guaranteed (the hop nearest us wrote it), and make the mismatch visible.
      //
      // The previous `Math.max(0, ...)` clamped to the *leftmost* entry here,
      // which is the one most likely to be caller-written: it failed open.
      if (chain.length < hops) {
        logger.security(
          `X-Forwarded-For has ${chain.length} entr${chain.length === 1 ? 'y' : 'ies'} but ` +
            `TRUSTED_PROXY_HOPS is ${hops}; falling back to the nearest hop. Check the setting ` +
            `against the deployed topology.`
        );
        return chain[chain.length - 1] as string;
      }

      // Count in from the right: the last entry was appended by the hop nearest
      // to us, so it is the only one no caller could have written.
      const ip = chain[chain.length - hops];
      if (ip) return ip;
    }
  }

  // Single-valued and overwritten (not appended) by nginx/ALB, so it carries the
  // same guarantee when present.
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return UNKNOWN_CLIENT_IP;
}
