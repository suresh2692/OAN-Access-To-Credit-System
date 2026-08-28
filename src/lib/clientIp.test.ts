import { afterEach, describe, expect, it } from 'vitest';
import { getClientIp, UNKNOWN_CLIENT_IP } from './clientIp';

const requestWith = (headers: Record<string, string>) =>
  new Request('https://a2c.example.com/api/auth/login', { headers });

afterEach(() => {
  delete process.env.TRUSTED_PROXY_HOPS;
});

describe('getClientIp', () => {
  it('ignores caller-supplied entries and takes the one our proxy appended', () => {
    // The attack: prepend a chosen address so the rate limiter buckets by it.
    // Only the rightmost entry was written by infrastructure we control.
    const request = requestWith({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 203.0.113.9' });

    expect(getClientIp(request)).toBe('203.0.113.9');
  });

  it('reads a single-entry chain', () => {
    expect(getClientIp(requestWith({ 'x-forwarded-for': '203.0.113.9' }))).toBe('203.0.113.9');
  });

  it('tolerates whitespace and empty segments', () => {
    const request = requestWith({ 'x-forwarded-for': ' 1.1.1.1 , , 203.0.113.9 ' });

    expect(getClientIp(request)).toBe('203.0.113.9');
  });

  it('counts in further when more trusted hops are declared', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    const request = requestWith({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9, 10.0.0.5' });

    expect(getClientIp(request)).toBe('203.0.113.9');
  });

  it('never runs off the front of a chain shorter than the hop count', () => {
    process.env.TRUSTED_PROXY_HOPS = '5';
    const request = requestWith({ 'x-forwarded-for': '203.0.113.9' });

    expect(getClientIp(request)).toBe('203.0.113.9');
  });

  it('falls back to the nearest hop — not the leftmost entry — when the chain is shorter than the declared hop count', () => {
    // Regression: the old `Math.max(0, length - hops)` clamped to index 0 here,
    // which is the entry most likely to have been written by the caller. A chain
    // shorter than the hop count proves the declared topology is wrong, so the
    // only defensible reading is the rightmost entry.
    process.env.TRUSTED_PROXY_HOPS = '4';
    const request = requestWith({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' });

    expect(getClientIp(request)).toBe('203.0.113.9');
  });

  it('bounds an over-large hop count so a typo cannot read arbitrarily deep into the chain', () => {
    // TRUSTED_PROXY_HOPS is clamped to 4, so the read lands 4 in from the right
    // rather than wherever a mistyped value would have pointed.
    process.env.TRUSTED_PROXY_HOPS = '10';
    const chain = '1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4, 5.5.5.5, 203.0.113.9';

    expect(getClientIp(requestWith({ 'x-forwarded-for': chain }))).toBe('3.3.3.3');
  });

  it('is unspoofable at the correct hop count no matter how much the caller pads', () => {
    // The guarantee the module exists for: with the setting matching the real
    // topology, entries the caller invented never reach the result.
    process.env.TRUSTED_PROXY_HOPS = '1';
    const padded = Array.from({ length: 50 }, (_, i) => `10.0.0.${i}`).join(', ');
    const request = requestWith({ 'x-forwarded-for': `${padded}, 203.0.113.9` });

    expect(getClientIp(request)).toBe('203.0.113.9');
  });

  it('falls back to x-real-ip when there is no forwarded chain', () => {
    expect(getClientIp(requestWith({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9');
  });

  it('returns the sentinel rather than throwing when nothing is available', () => {
    expect(getClientIp(requestWith({}))).toBe(UNKNOWN_CLIENT_IP);
  });
});
