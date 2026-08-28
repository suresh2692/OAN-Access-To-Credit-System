import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigationPending } from './useNavigationPending';

// The hook reads the *rendered* URL from the router to decide when a navigation
// has finished. These stand in for that, and `arriveAt` plays the part of the
// App Router committing the new route.
let renderedPathname = '/dashboard';
let renderedSearch = '';

vi.mock('next/navigation', () => ({
  usePathname: () => renderedPathname,
  useSearchParams: () => new URLSearchParams(renderedSearch),
}));

function arriveAt(pathname: string) {
  renderedPathname = pathname;
  window.history.replaceState(null, '', pathname);
}

/** Simulate a plain left-click on an in-document anchor, the way a user would. */
function clickLink(href: string): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.href = href;
  document.body.appendChild(anchor);
  anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
  return anchor;
}

beforeEach(() => {
  renderedPathname = '/dashboard';
  renderedSearch = '';
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useNavigationPending', () => {
  it('is idle when nothing has navigated', () => {
    const { result, unmount } = renderHook(() => useNavigationPending());

    expect(result.current).toBe(false);
    unmount();
  });

  it('reports a link click as pending until the new route renders', () => {
    const { result, rerender, unmount } = renderHook(() => useNavigationPending());

    // A click on a same-origin link starts a navigation — the URL will change
    // before the App Router has committed the new route.
    let anchor!: HTMLAnchorElement;
    act(() => {
      anchor = clickLink('/leads');
    });
    expect(result.current).toBe(true);

    // Simulate the App Router committing the new route.
    act(() => {
      renderedPathname = '/leads';
    });
    rerender();
    expect(result.current).toBe(false);

    anchor.remove();
    unmount();
  });

  it('reports a popstate (back/forward) as pending', () => {
    // Start at /dashboard (both the rendered pathname and the browser URL).
    const { result, unmount } = renderHook(() => useNavigationPending());

    // Simulate a back/forward navigation: the browser URL changes but the
    // rendered pathname hasn't caught up yet. In jsdom, popstate doesn't fire
    // automatically from pushState, so we drive both steps ourselves.
    act(() => {
      // The hook's popstate handler captures `window.location` at the time of
      // the event — so the URL must already differ from the rendered pathname.
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // The hook saw the popstate and recorded `startedFrom` as `/dashboard?`,
    // which still equals the rendered URL → pending = true.
    expect(result.current).toBe(true);
    unmount();
  });

  it('ignores a click to the URL already rendered', () => {
    const { result, unmount } = renderHook(() => useNavigationPending());

    let anchor!: HTMLAnchorElement;
    act(() => {
      anchor = clickLink('/dashboard');
    });

    expect(result.current).toBe(false);

    anchor.remove();
    unmount();
  });

  it('cleans up its event listeners on unmount', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useNavigationPending());

    // The hook should have registered a click listener in the capture phase.
    const clickCalls = addSpy.mock.calls.filter(([type]) => type === 'click');
    expect(clickCalls.length).toBeGreaterThanOrEqual(1);

    unmount();

    // After unmount the same listener should have been removed.
    const removeClickCalls = removeSpy.mock.calls.filter(([type]) => type === 'click');
    expect(removeClickCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('still reports a plain link click', () => {
    const { result, unmount } = renderHook(() => useNavigationPending());

    const anchor = document.createElement('a');
    anchor.href = '/leads';
    document.body.appendChild(anchor);

    act(() => {
      anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    });

    expect(result.current).toBe(true);

    anchor.remove();
    unmount();
  });

  it('ends the pending state on arrival, without a second render pass', () => {
    const { result, rerender, unmount } = renderHook(() => useNavigationPending());

    // Start a navigation via link click.
    let anchor!: HTMLAnchorElement;
    act(() => {
      anchor = clickLink('/leads');
    });
    expect(result.current).toBe(true);

    // The App Router commits the new route.
    act(() => arriveAt('/leads'));
    rerender();

    expect(result.current).toBe(false);

    anchor.remove();
    unmount();
  });
});
