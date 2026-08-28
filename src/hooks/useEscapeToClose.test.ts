import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEscapeToClose } from './useEscapeToClose';

function pressEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

describe('useEscapeToClose', () => {
  it('closes the only active layer on Escape', () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useEscapeToClose(true, onClose));

    act(() => pressEscape());

    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('closes only the topmost layer when stacked, not the one underneath', () => {
    const onCloseOuter = vi.fn();
    const onCloseInner = vi.fn();

    const outer = renderHook(() => useEscapeToClose(true, onCloseOuter));
    const inner = renderHook(() => useEscapeToClose(true, onCloseInner));

    act(() => pressEscape());

    expect(onCloseInner).toHaveBeenCalledTimes(1);
    expect(onCloseOuter).not.toHaveBeenCalled();

    inner.unmount();
    outer.unmount();
  });

  it('does not fire for a layer that is not active', () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useEscapeToClose(false, onClose));

    act(() => pressEscape());

    expect(onClose).not.toHaveBeenCalled();
    unmount();
  });

  it('does not fire once the layer has unmounted', () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useEscapeToClose(true, onClose));

    unmount();
    act(() => pressEscape());

    expect(onClose).not.toHaveBeenCalled();
  });
});
