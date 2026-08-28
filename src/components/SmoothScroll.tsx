'use client';

import { isScrollLocked, subscribeScrollLock } from '@/lib/scrollLock';
import Lenis from 'lenis';
import { useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Smooth scrolling for the authenticated shell, via Lenis.
 *
 * Mounted once in `(dashboard)/layout.tsx` so it covers every role's screens
 * without each layout having to opt in.
 *
 * It resolves its target from the DOM rather than from a ref, because the shell
 * is built three different ways: the farmer, bank-agent and dev-agent groups each
 * render `#dashboard-main` from their own layout file, and the bank-admin pages
 * build their own chrome and scroll the window. Those element ids are already the
 * layout contract — `styles/main-layout.scss` styles the shell by id — so keying
 * off them is no less stable than a ref would be, and it needs no edits in four
 * places. When `#dashboard-main` isn't there, Lenis falls back to its default of
 * the window, which is right for the pages that scroll that way.
 */

/** Deliberately restrained: perceptible ease, not a long glide someone has to wait out. */
const LENIS_OPTIONS = {
  duration: 0.85,
  // Standard Lenis exponential ease-out.
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  // Touch devices already scroll smoothly, and hijacking that reliably makes a
  // phone feel worse rather than better.
  smoothWheel: true,
  syncTouch: false,
} as const;

export function SmoothScroll() {
  // Rebuilt per route, because the nodes it binds to change: the role layouts key
  // `#dashboard-content` on the pathname (so the page-enter animation replays),
  // which means a navigation replaces the element Lenis is observing for size
  // changes. A single long-lived instance would be watching a detached node.
  const pathname = usePathname();

  // Anyone who has asked their OS for less motion gets native scrolling. Read
  // through the same hook the motion components use rather than a one-off
  // matchMedia call: it is SSR-safe and it *subscribes*, so turning the setting
  // on mid-session takes effect instead of being missed until the next route.
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const wrapper = document.getElementById('dashboard-main');

    // `content` is only what Lenis observes for size changes — the scroll limit
    // comes from `wrapper.scrollHeight` (see `Dimensions.onContentResize` in
    // lenis core). `#dashboard-content` is the part that grows and shrinks as
    // pages render, so it is the right thing to watch; the wrapper itself is a
    // safe stand-in if a shell ever renders without it.
    const lenis = new Lenis(
      wrapper
        ? {
            ...LENIS_OPTIONS,
            wrapper,
            content: document.getElementById('dashboard-content') ?? wrapper,
          }
        : { ...LENIS_OPTIONS }
    );

    // A lock can already be held when this instance is built (a dialog open across
    // a route change). `subscribeScrollLock` reports transitions, not current
    // state, so the starting position has to be read directly.
    if (isScrollLocked()) lenis.stop();

    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    // A dialog's `overflow: hidden` means nothing to Lenis — it writes
    // `scrollTop` itself — so the lock has to stop it explicitly, or the page
    // scrolls behind an open modal.
    const unsubscribe = subscribeScrollLock((isLocked) => {
      if (isLocked) lenis.stop();
      else lenis.start();
    });

    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [pathname, prefersReducedMotion]);

  return null;
}
