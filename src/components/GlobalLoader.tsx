'use client';

import { Loader } from '@/components/ui/Loader';
import { useNavigationPending } from '@/hooks/useNavigationPending';
import { lockScroll } from '@/lib/scrollLock';
import { selectBlockingMessage, selectIsLoading } from '@/store/loadingSlice';
import { useAppSelector } from '@/store/hooks';
import { useEffect, useState } from 'react';

/**
 * Work has to last this long before the bar appears. Below it, a request that
 * resolves from cache would produce a flash of indicator and nothing else, which
 * reads as a glitch rather than as feedback.
 */
const SHOW_DELAY_MS = 140;

/**
 * How long the bar lingers after the work finishes. Back-to-back requests are
 * common (a list fetch followed by its counts), and without this the bar would
 * blink out and back in between them.
 */
const HIDE_DELAY_MS = 320;

/**
 * Debounces a busy flag: delays the rise, delays the fall.
 */
function useSmoothedBusy(isBusy: boolean): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isBusy) {
      const showTimer = setTimeout(() => setIsVisible(true), SHOW_DELAY_MS);
      return () => clearTimeout(showTimer);
    }

    // Not busy any more — but if the bar is up, let it linger a moment.
    if (!isVisible) return;
    const hideTimer = setTimeout(() => setIsVisible(false), HIDE_DELAY_MS);
    return () => clearTimeout(hideTimer);
    // `isVisible` is read here but deliberately not a trigger: re-running this
    // effect when it flips would restart the hide timer it just set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusy]);

  return isVisible;
}

/**
 * The thin, non-blocking activity bar across the top of the viewport.
 *
 * Fed by two things: any tracked async thunk in flight (counted in
 * `store/loadingSlice`) and any App Router navigation in flight. Those are the
 * two ways this app makes someone wait, so between them the bar answers "did my
 * click land?" everywhere, without each screen having to wire up its own answer.
 */
export function GlobalProgressBar() {
  const hasPendingRequests = useAppSelector(selectIsLoading);
  const isNavigating = useNavigationPending();
  const isVisible = useSmoothedBusy(hasPendingRequests || isNavigating);

  if (!isVisible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-brand-green/10"
      role="presentation"
    >
      <div className="h-full w-full origin-left bg-[linear-gradient(90deg,transparent,var(--color-green-primary),var(--color-green-border))] animate-progress-sweep motion-reduce:animate-none motion-reduce:opacity-70" />
    </div>
  );
}

/**
 * Full-screen overlay for the few operations that must not be worked around.
 *
 * Driven only by `loading.blockingMessage`, which nothing sets implicitly —
 * a caller has to ask for it (see `performGlobalLogout`). Ordinary requests get
 * the bar above instead: blocking the whole screen for a list fetch is how a
 * fast app comes to feel slow.
 */
export function GlobalBlockingOverlay() {
  const message = useAppSelector(selectBlockingMessage);

  // Keeps the page behind from scrolling under the overlay while it is up. Uses
  // the shared lock so it freezes the dashboard's own scroller and pauses smooth
  // scrolling too — setting `body { overflow: hidden }` alone does neither.
  useEffect(() => {
    if (!message) return;
    return lockScroll();
  }, [message]);

  if (!message) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-white/85 backdrop-blur-sm animate-fade-in-up"
      aria-busy="true"
    >
      <Loader size="lg" label={message} />
    </div>
  );
}

/**
 * Both global loading surfaces, mounted once for the whole app in `Providers`.
 */
export function GlobalLoader() {
  return (
    <>
      <GlobalProgressBar />
      <GlobalBlockingOverlay />
    </>
  );
}
