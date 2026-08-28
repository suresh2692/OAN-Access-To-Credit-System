'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Nothing should sit spinning forever because a click didn't lead anywhere. */
const SAFETY_TIMEOUT_MS = 12_000;

/**
 * True while an App Router navigation is in flight.
 *
 * The App Router has no public "router is navigating" signal, and the two
 * alternatives both fall short: `useLinkStatus` only works inside a `Link`'s own
 * subtree (so it can't drive one indicator for the whole app), and reacting to a
 * pathname change fires *after* the navigation, which is exactly too late.
 *
 * So this watches for the click that starts a navigation, at the document level
 * in the capture phase. One listener covers every link in the app without each
 * one having to opt in.
 *
 * Completion is *derived* rather than cleared in an effect: what is stored is the
 * URL the navigation started from, and the navigation is pending exactly while
 * that still matches the URL being rendered. So arriving somewhere new ends the
 * pending state during render, with no second pass.
 *
 * Clicks that will not navigate this document are filtered out — modifier-clicks
 * and middle-clicks (new tab/window), a `target` other than `_self`, downloads,
 * cross-origin hrefs, non-http schemes (`mailto:`, `tel:`), and links to the URL
 * we are already on. Anything that slips through is bounded by the safety timeout
 * rather than left running.
 */
export function useNavigationPending(): boolean {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = `${pathname}?${searchParams.toString()}`;

  /** The URL a navigation was started from, or null when none is in flight. */
  const [startedFrom, setStartedFrom] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const begin = useCallback((from: string) => {
    setStartedFrom(from);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStartedFrom(null), SAFETY_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const currentHref = () => `${window.location.pathname}?${window.location.search.replace(/^\?/, '')}`;

    const handleClick = (event: MouseEvent) => {
      // Only a plain primary-button click navigates the current document.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.defaultPrevented) return;

      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
      // Same URL means no navigation — and a hash-only change is not one either.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      begin(currentHref());
    };

    // Back/forward is a navigation the click listener can never see.
    const handlePopState = () => begin(currentHref());

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [begin]);

  return startedFrom !== null && startedFrom === currentUrl;
}
