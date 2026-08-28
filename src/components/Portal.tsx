'use client';

import { ReactNode, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
}

/** No store to subscribe to — the answer never changes after hydration. */
const subscribe = () => () => {};

/**
 * True once the component is running on the client.
 *
 * `useSyncExternalStore` is the right tool for this rather than a `useState` +
 * `useEffect` mount flag: it is given a *separate* server snapshot, so the server
 * render and the hydrating client render both see `false` and agree, and React
 * moves to `true` itself afterwards. The flag version had to call `setState`
 * inside an effect to get there, which is a cascading render (and what
 * `react-hooks/set-state-in-effect` flags).
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

/**
 * Renders children into `document.body`, escaping any ancestor that clips or
 * stacks them (overflow, transforms, z-index) — used by the dropdown menus that
 * position themselves against the viewport.
 *
 * Renders nothing until hydration: `document` does not exist during SSR, and
 * portalling on the very first client render would not match the HTML the server
 * sent.
 */
export function Portal({ children }: PortalProps) {
  const isHydrated = useIsHydrated();

  if (!isHydrated) return null;

  return createPortal(children, document.body);
}
