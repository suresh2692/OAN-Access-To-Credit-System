'use client';

import { useEffect, useRef } from 'react';

type ContainerRef = React.RefObject<HTMLElement | null>;

interface Layer {
  id: symbol;
  containers: ContainerRef[];
}

// Shared across every useEscapeToClose instance on the page. Registration
// order tracks stacking order (a popover opened from inside an already-open
// modal registers after it) and is the fallback tiebreaker, but a layer whose
// container currently holds focus always wins — see handleKeyDown below.
let stack: Layer[] = [];

/**
 * Closes on Escape, but only while this is the topmost active layer — so
 * dismissing a nested popover/dropdown/modal with Escape never also closes
 * whatever it's layered on top of. Use for any dismissible overlay (dropdown,
 * popover, dialog); `useModalA11y` builds its full dialog behavior on top of this.
 *
 * Pass `containers` (the trigger/content ref(s) that make up this layer's UI)
 * so a layer left open via Tab-away — instead of an explicit close — still
 * takes priority when it's the one that currently has focus, even if a layer
 * opened afterward is technically higher on the registration stack.
 */
export function useEscapeToClose(active: boolean, onClose: () => void, containers?: ContainerRef | ContainerRef[]) {
  const idRef = useRef<symbol | null>(null);
  if (idRef.current == null) {
    idRef.current = Symbol('escape-layer');
  }
  const onCloseRef = useRef(onClose);
  const containersRef = useRef<ContainerRef[]>([]);

  // Keeps both refs current on every render (not just when `active` changes)
  // without re-subscribing the keydown listener below — ref mutation has to
  // happen in an effect, not directly in the render body.
  useEffect(() => {
    onCloseRef.current = onClose;
    containersRef.current = containers ? (Array.isArray(containers) ? containers : [containers]) : [];
  });

  useEffect(() => {
    if (!active) return;
    const id = idRef.current!;
    const layer: Layer = { id, containers: containersRef.current };
    stack.push(layer);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      const focused = document.activeElement;
      const focusedLayer = focused
        ? [...stack].reverse().find((l) => l.containers.some((c) => c.current?.contains(focused)))
        : undefined;
      const topmost = focusedLayer ?? stack[stack.length - 1];

      if (topmost?.id !== id) return;
      onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      stack = stack.filter((l) => l.id !== id);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);
}
