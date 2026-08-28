/**
 * One ref-counted scroll lock for the whole app.
 *
 * Modals used to lock scrolling by setting `document.body.style.overflow`
 * directly, which does nothing on any dashboard screen: the scroll container
 * there is `#dashboard-main`, not the body (see `styles/main-layout.scss`, where
 * the shell is `height: 100vh; overflow: hidden`). So a dialog would open and the
 * page behind it would keep scrolling under it.
 *
 * This locks the body *and* the real scroller, and lets the smooth-scroll
 * provider subscribe so Lenis can be paused for the duration — a smooth-scroll
 * instance driving `scrollTop` ignores `overflow: hidden` entirely and would keep
 * moving the page behind an open dialog.
 *
 * Ref-counted so stacked dialogs behave: an inner one closing must not release a
 * lock the outer one still holds.
 */

type ScrollLockListener = (isLocked: boolean) => void;

const listeners = new Set<ScrollLockListener>();

let lockCount = 0;
/** Inline values to put back on release, so we restore rather than assume. */
let restore: (() => void) | null = null;

/** The scrollers to freeze. The window/body case covers non-dashboard screens. */
function scrollableElements(): HTMLElement[] {
  if (typeof document === 'undefined') return [];
  const elements: HTMLElement[] = [document.body];
  const dashboardScroller = document.getElementById('dashboard-main');
  if (dashboardScroller) elements.push(dashboardScroller);
  return elements;
}

function applyLock() {
  const elements = scrollableElements();
  const previous = elements.map((el) => el.style.overflow);
  elements.forEach((el) => {
    el.style.overflow = 'hidden';
  });
  restore = () => {
    elements.forEach((el, i) => {
      el.style.overflow = previous[i] ?? '';
    });
  };
}

function notify(isLocked: boolean) {
  listeners.forEach((listener) => listener(isLocked));
}

/**
 * Freezes page scrolling. Returns the release function — call it exactly once
 * (an effect cleanup is the natural home).
 */
export function lockScroll(): () => void {
  if (lockCount === 0) {
    applyLock();
    notify(true);
  }
  lockCount++;

  let released = false;
  return () => {
    // Guarded: a double release would decrement someone else's lock and let the
    // page scroll while a dialog is still open.
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      restore?.();
      restore = null;
      notify(false);
    }
  };
}

/** True while at least one lock is held. */
export function isScrollLocked(): boolean {
  return lockCount > 0;
}

/**
 * Subscribes to lock/unlock transitions. Returns an unsubscribe function.
 * Only edge transitions are reported, not every nested lock.
 */
export function subscribeScrollLock(listener: ScrollLockListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
