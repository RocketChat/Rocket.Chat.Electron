import { act, fireEvent, renderHook } from '@testing-library/react';

import { useKeyboardShortcuts } from './useKeyboardShortcuts';

// The modifier differs per platform and these specs run on all three CI hosts.
const isDarwin = process.platform === 'darwin';
const modifierKey = isDarwin ? 'Meta' : 'Control';
const heldFlag = isDarwin ? { metaKey: true } : { ctrlKey: true };
const releasedFlag = isDarwin ? { metaKey: false } : { ctrlKey: false };

describe('useKeyboardShortcuts', () => {
  it('starts hidden', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    expect(result.current).toBe(false);
  });

  it('reveals the shortcuts on the modifier keydown even though it omits its own flag', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    // Chromium reports metaKey/ctrlKey as false on the modifier's own keydown,
    // so the key name is what has to drive this.
    act(() => {
      fireEvent.keyDown(window, { key: modifierKey, ...releasedFlag });
    });

    expect(result.current).toBe(true);
  });

  it('hides them again when the modifier is released', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireEvent.keyDown(window, { key: modifierKey, ...releasedFlag });
    });
    act(() => {
      fireEvent.keyUp(window, { key: modifierKey, ...releasedFlag });
    });

    expect(result.current).toBe(false);
  });

  it('keeps them visible while the modifier is held with another key', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireEvent.keyDown(window, { key: modifierKey, ...releasedFlag });
    });
    act(() => {
      fireEvent.keyDown(window, { key: '1', ...heldFlag });
    });
    act(() => {
      fireEvent.keyUp(window, { key: '1', ...heldFlag });
    });

    expect(result.current).toBe(true);
  });

  it('hides them when the window loses input to a native menu', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireEvent.keyDown(window, { key: modifierKey, ...releasedFlag });
    });
    expect(result.current).toBe(true);

    // Opening the meatball popup (or switching apps) swallows the keyup, so the
    // numbers would otherwise stay on screen until the modifier was pressed
    // again.
    act(() => {
      fireEvent.blur(window);
    });

    expect(result.current).toBe(false);
  });

  it('recovers from a swallowed keyup once the pointer moves', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireEvent.keyDown(window, { key: modifierKey, ...releasedFlag });
    });
    expect(result.current).toBe(true);

    act(() => {
      fireEvent.mouseMove(window, releasedFlag);
    });

    expect(result.current).toBe(false);
  });

  it('stays visible when the pointer moves while the modifier is still held', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireEvent.keyDown(window, { key: modifierKey, ...releasedFlag });
    });
    act(() => {
      fireEvent.mouseMove(window, heldFlag);
    });

    expect(result.current).toBe(true);
  });
});
