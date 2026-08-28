'use client';

import { Clock, ShieldAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Explains why the previous session ended, on whichever login page the person
 * landed on.
 *
 * Every sign-out in the app now lands on `/login` and carries a `reason` (see
 * `loginRouteFor` in `auth/rbac.ts`). Without this, an expired session looks like
 * a session that simply vanished — the person is returned to a chooser with no
 * account of what happened, which reads as a bug and invites a support ticket.
 */

const NOTICES = {
  idle: {
    icon: Clock,
    title: 'Signed out for inactivity',
    body: 'Your session ended because it was left idle. Please sign in again to continue.',
  },
  session: {
    icon: ShieldAlert,
    title: 'Your session has ended',
    body: 'For your security we signed you out. Please sign in again to pick up where you left off.',
  },
} as const;

interface SessionEndedNoticeProps {
  /**
   * Set when the form already has something more specific to say (a failed
   * sign-in, a password confirmation). Two stacked banners compete, and the
   * newer message is the one the person needs.
   */
  suppressed?: boolean;
  className?: string;
}

export function SessionEndedNotice({ suppressed = false, className }: SessionEndedNoticeProps) {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  // Capture the reason on the first render so the banner shows, then strip the
  // query param from the URL so a manual refresh gives a clean login page.
  const [capturedReason] = useState(() => reason);

  useEffect(() => {
    if (capturedReason === 'idle' || capturedReason === 'session') {
      const url = new URL(window.location.href);
      url.searchParams.delete('reason');
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, [capturedReason]);

  const notice = capturedReason === 'idle' || capturedReason === 'session' ? NOTICES[capturedReason] : null;

  if (!notice || suppressed) return null;

  const Icon = notice.icon;

  return (
    <div
      role="status"
      className={
        className ??
        'w-full mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 animate-fade-in-down'
      }
    >
      <Icon className="mt-0.5 shrink-0 text-amber-600" size={18} strokeWidth={2.5} aria-hidden="true" />
      <div>
        <p className="text-sm font-bold text-amber-900">{notice.title}</p>
        <p className="mt-0.5 text-sm font-medium text-amber-900/90">{notice.body}</p>
      </div>
    </div>
  );
}

