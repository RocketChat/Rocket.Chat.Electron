import { useEffect, useState } from 'react';

/**
 * Whether the workspace shortcut modifier (⌘ on macOS, Ctrl elsewhere) is
 * currently held, so the tabs can reveal their shortcut numbers.
 *
 * The modifier's own keydown does not reliably report its flag (`metaKey` is
 * still false on the ⌘ keydown itself), so presses and releases are tracked by
 * key name, while every other event resyncs from the flag. The flag is what
 * recovers the state after a native menu (the meatball popup) or an app switch
 * swallows the `keyup`, which would otherwise leave the numbers stuck on screen
 * until the modifier was pressed again.
 */
export const useKeyboardShortcuts = (): boolean => {
  const [isEachShortcutVisible, setShortcutsVisible] = useState(false);

  useEffect(() => {
    const modifierKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    const isModifierHeld = (event: KeyboardEvent | MouseEvent): boolean =>
      process.platform === 'darwin' ? event.metaKey : event.ctrlKey;

    const handleKeyDown = (event: KeyboardEvent): void => {
      setShortcutsVisible(event.key === modifierKey || isModifierHeld(event));
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      setShortcutsVisible(event.key !== modifierKey && isModifierHeld(event));
    };

    const handleMouseMove = (event: MouseEvent): void => {
      setShortcutsVisible(isModifierHeld(event));
    };

    const hide = (): void => {
      setShortcutsVisible(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // Recovers the state once the pointer moves, for the keyups we never saw.
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', hide);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);

  return isEachShortcutVisible;
};
