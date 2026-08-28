import type { NavItem, NavSection } from '@/components/Sidebar';

/**
 * Find the single most-specifically matched nav item for a given pathname.
 * Longer prefix wins, so `/leads/lead` beats `/leads` when visiting `/leads/lead`.
 *
 * Extracted here (rather than living in Sidebar or DashboardShell) to avoid a
 * circular dependency: Sidebar defines the types, DashboardShell renders the
 * Sidebar, and both need this matcher.
 */
export function resolveActiveNavItem(
  sections: NavSection[],
  pathname: string
): NavItem | null {
  let best: NavItem | null = null;
  let bestLen = -1;
  for (const section of sections) {
    for (const item of section.items) {
      for (const candidate of item.activePaths ?? [item.path]) {
        if ((pathname === candidate || pathname.startsWith(candidate + '/')) && candidate.length > bestLen) {
          bestLen = candidate.length;
          best = item;
        }
      }
    }
  }
  return best;
}

/**
 * Picks the title for the current path: the label of the deepest-matching nav
 * item, then an explicit override for paths that have no nav item of their own,
 * then a fallback.
 */
export function resolvePageTitle(
  sections: NavSection[],
  pathname: string,
  overrides: Record<string, string> = {},
  fallback = 'Dashboard',
): string {
  const active = resolveActiveNavItem(sections, pathname);
  if (active) return active.label;

  // Check overrides with prefix matching so sub-routes (e.g. /kyc-compliance/upload)
  // still resolve when the parent path is the only key in the map.
  let bestOverride: string | undefined;
  let bestOverrideLen = -1;
  for (const [key, value] of Object.entries(overrides)) {
    if ((pathname === key || pathname.startsWith(key + '/')) && key.length > bestOverrideLen) {
      bestOverrideLen = key.length;
      bestOverride = value;
    }
  }

  return bestOverride ?? fallback;
}
