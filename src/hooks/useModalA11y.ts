'use client';

import { lockScroll } from '@/lib/scrollLock';
import { useEffect, useRef } from 'react';
import { useEscapeToClose } from './useEscapeToClose';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Delegated to the shared lock in `lib/scrollLock`, which is ref-counted the same
// way this used to be but freezes the *actual* scroller.
//
// Setting `document.body.style.overflow` here had no effect on any dashboard
// screen — the scroll container is `#dashboard-main`, so the page behind an open
// dialog carried on scrolling. The shared lock also pauses smooth scrolling,
// which ignores `overflow: hidden` altogether.
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return lockScroll();
  }, [active]);
}

/**
 * Standard dialog accessibility behavior for modals: traps Tab focus inside the
 * returned ref, closes on Escape, focuses the dialog on open, and restores focus
 * to the previously focused element on close. Attach the returned ref, plus
 * `role="dialog"` `aria-modal="true"` `tabIndex={-1}`, to the modal's outer container.
 *
 * By default the first focusable element in DOM order is focused on open; pass
 * `initialFocusRef` to focus a specific element instead (e.g. a form's first
 * input rather than a header close button that happens to come first in markup).
 */
export function useModalA11y<T extends HTMLElement>(
  isOpen: boolean,
  onClose: () => void,
  initialFocusRef?: React.RefObject<HTMLElement | null>
) {
  const containerRef = useRef<T>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEscapeToClose(isOpen, onClose, containerRef);
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // Deferred so the dialog's own contents are mounted before we try to focus them.
    const focusTimeoutId = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      const container = containerRef.current;
      const focusable = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable?.[0] ?? container)?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        // Nothing focusable yet (e.g. a loading skeleton) — keep focus pinned
        // to the container (tabIndex={-1} per this hook's contract) instead of
        // letting Tab escape to the page behind the modal.
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimeoutId);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
    // isOpen is the only intentional trigger — initialFocusRef/containerRef are
    // stable ref objects, so this doesn't need to re-run when they "change".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return containerRef;
}
