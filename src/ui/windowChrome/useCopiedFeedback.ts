import { useCallback, useEffect, useRef, useState } from 'react';

/** How long a copy button stays acknowledged before returning to its icon. */
const ACKNOWLEDGEMENT = 1500;

/**
 * Says that something was copied.
 *
 * Copying to the clipboard produces nothing a reader can see, so the button
 * that did it answers for itself: it holds a tick for a moment and then goes
 * back to what it was. Cheaper than a toast, and it appears where the reader is
 * already looking — at the button they just pressed.
 */
export const useCopiedFeedback = (): [boolean, () => void] => {
  const [hasCopied, setHasCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const acknowledge = useCallback(() => {
    setHasCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHasCopied(false), ACKNOWLEDGEMENT);
  }, []);

  return [hasCopied, acknowledge];
};
