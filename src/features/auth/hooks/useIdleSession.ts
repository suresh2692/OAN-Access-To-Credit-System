'use client';

import { logger } from '@/lib/logger';
import { SESSION_POLICY } from '@/lib/securityConfig';
import { useCallback, useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'] as const;

/** Cross-tab channel so activity in one tab does not let another one time out. */
const IDLE_CHANNEL = 'a2c-session-activity';

const IDLE_TIMEOUT_MS = SESSION_POLICY.idleTimeoutSeconds * 1000;
const WARNING_MS = SESSION_POLICY.idleWarningSeconds * 1000;
const PING_INTERVAL_MS = SESSION_POLICY.activityPingMinIntervalSeconds * 1000;

export interface IdleSession {
  /** True once the countdown has started and sign-out is imminent. */
  isWarning: boolean;
  /** Whole seconds left before sign-out. Only meaningful while `isWarning`. */
  secondsRemaining: number;
  /** Dismiss the warning and restart the timer. */
  staySignedIn: () => void;
}

/**
 * Tracks whether the person is still at the keyboard.
 *
 * Mirrors — never replaces — the server-side timeout. The authority is the
 * `session_activity` cookie, whose max-age is this same policy value and which
 * the middleware and `/api/auth/refresh` both enforce; if this hook were
 * bypassed entirely, the session would still die on the server. What it adds is
 * that the sign-out is announced rather than discovered: on the multi-step loan
 * form, a silent expiry would throw away a half-filled application.
 *
 * Deliberately driven by real input events. Timers alone would keep counting
 * during genuine use, and API traffic alone would be kept alive forever by
 * background polling.
 *
 * The deadline lives in a ref rather than state: it changes on every keystroke
 * and nothing renders from it directly, so keeping it out of the render cycle
 * avoids re-rendering the whole authenticated tree as someone types. The one
 * second interval is what turns it into the visible countdown.
 */
export function useIdleSession(enabled: boolean, onExpire: () => void): IdleSession {
  const [isWarning, setIsWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(SESSION_POLICY.idleWarningSeconds);

  /** Epoch ms at which the session goes idle. 0 until the watcher is armed. */
  const deadlineRef = useRef(0);
  const lastPingRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const onExpireRef = useRef(onExpire);

  // Kept in a ref, and updated in an effect rather than during render, so the
  // subscription below does not tear down and rebuild every time the caller
  // passes a fresh closure.
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  /**
   * Restarts the countdown. Touches refs only — never state — so it is safe to
   * call from an effect body without triggering a cascading render.
   * `broadcast` is false when reacting to another tab's message.
   */
  const restart = useCallback((broadcast = true) => {
    const now = Date.now();
    deadlineRef.current = now + IDLE_TIMEOUT_MS;

    // Throttled: the server needs to know the session is alive, not about every
    // individual keystroke.
    if (now - lastPingRef.current >= PING_INTERVAL_MS) {
      lastPingRef.current = now;
      void fetch('/api/auth/heartbeat', { method: 'POST', credentials: 'include' })
        .then((response) => {
          // A 401 is the server saying the session is already over — it refuses
          // to revive one past the timeout. Nothing to log; the countdown here
          // will reach the same conclusion and sign out on its own.
          if (!response.ok && response.status !== 401) {
            logger.warn(`Session heartbeat returned ${response.status}`);
          }
        })
        .catch((error) => {
          // Offline or mid-deploy. The local countdown carries on regardless —
          // failing to reach the server is not a reason to extend a session — but
          // a heartbeat that stops landing means the server-side timer is no
          // longer being fed, so it is worth seeing rather than swallowing.
          logger.warn('Session heartbeat failed', error);
        });
    }

    if (broadcast) channelRef.current?.postMessage('active');
  }, []);

  useEffect(() => {
    if (!enabled) {
      deadlineRef.current = 0;
      return;
    }

    // Arm the timer. Set directly rather than through `restart` so mounting the
    // watcher does not fire a heartbeat — the middleware already refreshed the
    // activity cookie serving this page.
    deadlineRef.current = Date.now() + IDLE_TIMEOUT_MS;

    // Work in one tab should not sign the person out of another.
    const channel =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(IDLE_CHANNEL) : null;
    channelRef.current = channel;
    if (channel) {
      channel.onmessage = (event: MessageEvent) => {
        if (event.data === 'active') restart(false);
      };
    }

    const handleActivity = () => {
      // Once the warning is up, ordinary activity must not silently dismiss it.
      // The person has to answer it — otherwise a stray mouse bump on an
      // unattended desk would extend the session indefinitely.
      if (deadlineRef.current - Date.now() <= WARNING_MS) return;
      restart();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
      channel?.close();
      channelRef.current = null;
    };
  }, [enabled, restart]);

  useEffect(() => {
    if (!enabled) return;

    // One second is enough: this drives a countdown display, and the deadline is
    // an absolute timestamp, so a throttled background tab catches up on its
    // next tick rather than drifting.
    const interval = setInterval(() => {
      // Not armed yet (or just disarmed) — nothing to count down.
      if (!deadlineRef.current) return;

      const msLeft = deadlineRef.current - Date.now();

      if (msLeft <= 0) {
        deadlineRef.current = 0;
        setIsWarning(false);
        onExpireRef.current();
        return;
      }

      if (msLeft <= WARNING_MS) {
        setIsWarning(true);
        setSecondsRemaining(Math.ceil(msLeft / 1000));
      } else {
        // Same-value setState is a no-op in React, so this costs nothing on the
        // overwhelming majority of ticks; it exists to clear the warning after a
        // reset that came from another tab.
        setIsWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  const staySignedIn = useCallback(() => {
    // Force the ping through: this is an explicit answer to the warning, and the
    // throttle must not swallow the one request that matters.
    lastPingRef.current = 0;
    restart();
    setIsWarning(false);
  }, [restart]);

  return { isWarning, secondsRemaining, staySignedIn };
}
