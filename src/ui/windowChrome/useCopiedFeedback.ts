import type { CSSProperties, ReactElement } from 'react';
import { createElement, useCallback, useEffect, useRef, useState } from 'react';

/** How long a copy button stays acknowledged before returning to its icon. */
const ACKNOWLEDGEMENT = 1500;

const DEFAULT_ANNOUNCEMENT = 'Copied';

const VISUALLY_HIDDEN: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export type CopiedStatusProps = {
  hasCopied: boolean;
  label?: string;
};

/** Visually hidden polite status for the tick that `useCopiedFeedback` shows. */
export const CopiedStatus = ({
  hasCopied,
  label = DEFAULT_ANNOUNCEMENT,
}: CopiedStatusProps): ReactElement =>
  createElement(
    'span',
    {
      'role': 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
      'style': VISUALLY_HIDDEN,
    },
    hasCopied ? label : ''
  );

const applyLiveRegionStyle = (node: HTMLElement): void => {
  Object.assign(node.style, VISUALLY_HIDDEN);
};

/**
 * Says that something was copied.
 *
 * Copying to the clipboard produces nothing a reader can see, so the button
 * that did it answers for itself: it holds a tick for a moment and then goes
 * back to what it was. Cheaper than a toast, and it appears where the reader is
 * already looking — at the button they just pressed.
 *
 * Existing callers keep `[hasCopied, acknowledge]`. A live region is mounted
 * by the hook so those sites announce without a render change. Callers that
 * show the tick can also mount `CopiedStatus` if they want the node in-tree.
 */
export const useCopiedFeedback = (
  label = DEFAULT_ANNOUNCEMENT
): [boolean, () => void] => {
  const [hasCopied, setHasCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const liveRegion = useRef<HTMLSpanElement | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  useEffect(() => {
    const region = document.createElement('span');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    applyLiveRegionStyle(region);
    document.body.appendChild(region);
    liveRegion.current = region;
    return () => {
      region.remove();
      liveRegion.current = null;
    };
  }, []);

  useEffect(() => {
    if (liveRegion.current) {
      liveRegion.current.textContent = hasCopied ? label : '';
    }
  }, [hasCopied, label]);

  const acknowledge = useCallback(() => {
    setHasCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHasCopied(false), ACKNOWLEDGEMENT);
  }, []);

  return [hasCopied, acknowledge];
};
