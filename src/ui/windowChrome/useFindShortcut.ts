import { useEffect, type RefObject } from 'react';

/** Focuses the first input inside `containerRef` on Cmd/Ctrl+F. */
export const useFindShortcut = (
  containerRef: RefObject<HTMLElement | null>
): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== 'f') return;
      event.preventDefault();
      containerRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [containerRef]);
};
