import { afterEach, describe, expect, it, vi } from 'vitest';
import { isScrollLocked, lockScroll, subscribeScrollLock } from './scrollLock';

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

/** Stands in for the dashboard shell's real scroll container. */
function mountDashboardScroller() {
  const main = document.createElement('main');
  main.id = 'dashboard-main';
  document.body.appendChild(main);
  return main;
}

describe('lockScroll', () => {
  it('freezes the dashboard scroller, not just the body', () => {
    // The bug this covers: modals set `document.body.style.overflow` only, but on
    // every dashboard screen the scroller is #dashboard-main — so the page behind
    // an open dialog carried on scrolling.
    const main = mountDashboardScroller();

    const release = lockScroll();

    expect(main.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');

    release();

    expect(main.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
  });

  it('works on screens with no dashboard scroller', () => {
    const release = lockScroll();

    expect(document.body.style.overflow).toBe('hidden');

    release();

    expect(document.body.style.overflow).toBe('');
  });

  it('restores the value that was there rather than assuming empty', () => {
    document.body.style.overflow = 'auto';

    lockScroll()();

    expect(document.body.style.overflow).toBe('auto');
  });

  it('keeps the lock while an outer dialog still holds it', () => {
    const main = mountDashboardScroller();

    const releaseOuter = lockScroll();
    const releaseInner = lockScroll();

    releaseInner();
    expect(main.style.overflow).toBe('hidden');
    expect(isScrollLocked()).toBe(true);

    releaseOuter();
    expect(main.style.overflow).toBe('');
    expect(isScrollLocked()).toBe(false);
  });

  it('ignores a release called twice', () => {
    // A double release would decrement someone else's lock and let the page
    // scroll while their dialog was still open.
    const releaseOuter = lockScroll();
    const releaseInner = lockScroll();

    releaseInner();
    releaseInner();

    expect(isScrollLocked()).toBe(true);
    releaseOuter();
    expect(isScrollLocked()).toBe(false);
  });

  it('notifies subscribers on the edges only', () => {
    // This is what lets smooth scrolling be paused: Lenis writes scrollTop itself
    // and ignores `overflow: hidden` entirely.
    const listener = vi.fn();
    const unsubscribe = subscribeScrollLock(listener);

    const releaseOuter = lockScroll();
    const releaseInner = lockScroll();
    releaseInner();
    releaseOuter();

    expect(listener.mock.calls.map(([locked]) => locked)).toEqual([true, false]);
    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    subscribeScrollLock(listener)();

    lockScroll()();

    expect(listener).not.toHaveBeenCalled();
  });
});
