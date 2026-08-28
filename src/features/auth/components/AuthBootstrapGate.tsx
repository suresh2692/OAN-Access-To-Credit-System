'use client';

import { FullPageLoader } from '@/components/ui/Loader';
import { isProtectedRoute } from '@/features/auth/rbac';
import { getMeThunk, selectAuthStatus } from '@/features/auth/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Holds the first paint of an authenticated screen until the session has been
 * restored.
 *
 * This also *starts* the restore. Nothing used to wait for it, so a dashboard
 * rendered with `user === null` for a beat and then re-rendered with the real
 * user — showing "User", "User Portal", empty initials and a header with no bank
 * name for as long as the round trip took. That flash is what this removes.
 *
 * Only protected routes are gated, and only protected routes are probed at all.
 * `Providers` used to dispatch `getMe` unconditionally on mount, which meant the
 * login screen — where there is no session cookie by definition — sent an
 * authenticated request and took a 401 "Missing Authorization Header" for it.
 * On a public page there is nothing to restore, so asking is pure noise; on a
 * protected route the proxy middleware has already verified a session cookie
 * before this renders, so the wait is real work and not a guess.
 *
 * Driven by an effect rather than a one-shot mount hook so a client-side
 * navigation from a public page into a protected one still restores.
 *
 * `failed` renders through deliberately: a session that could not be restored is
 * for the 401 middleware to act on, and spinning forever would hide whatever the
 * screen wants to say about it.
 */
export function AuthBootstrapGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);

  const isRestoring = status === 'idle' || status === 'loading';
  const onProtectedRoute = isProtectedRoute(pathname);
  const needsRestore = onProtectedRoute && status === 'idle';

  // Guards against React 18 double-invoking the effect on mount and firing two
  // identical restores: `status` is captured before the first dispatch lands, so
  // the condition alone cannot deduplicate them.
  const restoreRequested = useRef(false);

  useEffect(() => {
    if (!needsRestore) {
      // Back on a public screen — signed out, or never signed in. Re-arm, so the
      // next protected route restores rather than trusting a stale flag.
      if (!onProtectedRoute) restoreRequested.current = false;
      return;
    }
    if (restoreRequested.current) return;
    restoreRequested.current = true;
    void dispatch(getMeThunk());
  }, [dispatch, needsRestore, onProtectedRoute]);

  if (onProtectedRoute && isRestoring) {
    return <FullPageLoader label="Restoring your session…" />;
  }

  return <>{children}</>;
}
