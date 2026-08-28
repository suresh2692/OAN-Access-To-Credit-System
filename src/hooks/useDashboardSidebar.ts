'use client';

import { useState } from 'react';

/** Below this width the sidebar is an off-canvas drawer, above it a collapsible rail. */
const MOBILE_BREAKPOINT_PX = 900;

export interface DashboardSidebarState {
  /** Desktop: the rail is narrowed to icons only. */
  isCollapsed: boolean;
  /** Mobile: the off-canvas drawer is showing. */
  isMobileOpen: boolean;
  /** Toggles whichever of the two applies at the current viewport width. */
  toggle: () => void;
  /** Closes the mobile drawer — for the backdrop tap. */
  closeMobile: () => void;
}

/**
 * Sidebar open/collapsed state for a dashboard shell.
 *
 * The farmer, bank-agent and dev-agent layouts each had an identical copy of this
 * — two state hooks, a width-dependent toggle, and an effect closing the drawer on
 * navigation. One implementation now, which also fixes that effect in one place
 * rather than three.
 *
 * Pass the current pathname; the drawer closes itself whenever it changes, so a
 * tap on a nav link doesn't leave the drawer sitting open over the page it just
 * navigated to.
 */
export function useDashboardSidebar(pathname: string): DashboardSidebarState {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Closing on navigation, adjusted during render instead of in an effect.
  //
  // The effect version (`useEffect(() => setIsMobileOpen(false), [pathname])`)
  // ran on *every* mount as well as every change, and set state in an effect —
  // a cascading render, which is what `react-hooks/set-state-in-effect` flags.
  // Comparing against the last pathname we rendered fires only on an actual
  // navigation, and React re-renders immediately with the corrected state rather
  // than painting the stale one first.
  const [renderedPathname, setRenderedPathname] = useState(pathname);
  if (pathname !== renderedPathname) {
    setRenderedPathname(pathname);
    if (isMobileOpen) setIsMobileOpen(false);
  }

  const toggle = () => {
    // Read at click time rather than tracked as state: this is the only place the
    // width matters, and a resize between renders would make a stored value stale.
    if (window.innerWidth <= MOBILE_BREAKPOINT_PX) {
      setIsMobileOpen((previous) => !previous);
    } else {
      setIsCollapsed((previous) => !previous);
    }
  };

  const closeMobile = () => setIsMobileOpen(false);

  return { isCollapsed, isMobileOpen, toggle, closeMobile };
}
