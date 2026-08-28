import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { canAccess, isProtectedRoute, type UserKind } from './rbac';

/**
 * Every dashboard route must appear in the access policy.
 *
 * `/loan-discovery` shipped with no entry at all, which made it readable by
 * anonymous visitors and by every signed-in role — the policy is opt-in, so a
 * new route directory is unguarded until someone remembers to list it. Asserting
 * against the filesystem is what makes the reminder automatic: adding a page
 * without a policy entry fails here rather than in production.
 */

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../app');
const DASHBOARD_DIR = path.join(APP_DIR, '(dashboard)');

/** Route-group segments — `(dashboard)`, `(bank-admin)` — are not part of the URL. */
const isRouteGroup = (segment: string) => segment.startsWith('(') && segment.endsWith(')');

/** A dynamic segment matches any value; a placeholder exercises the same prefix. */
const isDynamic = (segment: string) => segment.startsWith('[');

function collectRoutes(dir: string, segments: string[] = []): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const next = isRouteGroup(entry.name)
        ? segments
        : [...segments, isDynamic(entry.name) ? 'sample-id' : entry.name];
      routes.push(...collectRoutes(path.join(dir, entry.name), next));
    } else if (entry.name === 'page.tsx') {
      routes.push(`/${segments.join('/')}`);
    }
  }
  return routes;
}

const ALL_KINDS: ReadonlyArray<UserKind> = [
  'bank_admin',
  'bank_agent',
  'dev_agent',
  'marketplace',
  'farmer',
];

const dashboardRoutes = collectRoutes(DASHBOARD_DIR);

describe('dashboard route coverage', () => {
  it('finds the dashboard routes to check', () => {
    // Guards the walk itself: a rename that breaks it would otherwise turn this
    // whole file into a vacuous pass over an empty list.
    expect(dashboardRoutes.length).toBeGreaterThan(10);
  });

  it.each(dashboardRoutes)('requires a session for %s', (route) => {
    expect(isProtectedRoute(route)).toBe(true);
  });

  it.each(dashboardRoutes)('restricts %s to some subset of roles', (route) => {
    // `/profile` is deliberately shared by every signed-in role; everything else
    // belongs to a portal and must turn at least one role away.
    if (route.startsWith('/profile')) return;
    expect(ALL_KINDS.filter((kind) => canAccess(kind, route))).not.toHaveLength(ALL_KINDS.length);
  });
});
