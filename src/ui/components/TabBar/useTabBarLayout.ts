import { useEffect, useRef, useState } from 'react';

import type { Server } from '../../../servers/common';

const TAB_MIN_WIDTH = 52;
const TAB_GAP = 8;
const ADD_BUTTON_WIDTH = 36;
const COMPACT_AVG_WIDTH_THRESHOLD = 64;

export const computeVisibleServers = <S extends Server>(
  availableWidth: number,
  servers: S[],
  activeUrl: string | undefined
): S[] => {
  // Width 0 means "not measured yet" (ResizeObserver hasn't fired) —
  // render everything rather than collapsing the strip to one tab.
  if (availableWidth <= 0) {
    return servers;
  }

  const k = Math.max(
    1,
    Math.floor((availableWidth + TAB_GAP) / (TAB_MIN_WIDTH + TAB_GAP))
  );

  if (servers.length <= k) {
    return servers;
  }

  const visible = servers.slice(0, k);

  if (
    activeUrl !== undefined &&
    !visible.some((server) => server.url === activeUrl)
  ) {
    const activeServer = servers.find((server) => server.url === activeUrl);
    if (activeServer) {
      visible[visible.length - 1] = activeServer;
    }
  }

  return visible;
};

export const computeIsCompact = (
  availableWidth: number,
  visibleServerCount: number
): boolean => {
  if (availableWidth <= 0 || visibleServerCount <= 0) {
    return false;
  }

  return (
    availableWidth <
    visibleServerCount * (COMPACT_AVG_WIDTH_THRESHOLD + TAB_GAP)
  );
};

export const useTabBarLayout = <S extends Server>(
  servers: S[],
  activeUrl: string | undefined,
  hasAddButton: boolean
): {
  visibleServers: S[];
  compact: boolean;
  tabListRef: (node: HTMLElement | null) => void;
} => {
  const [availableWidth, setAvailableWidth] = useState(0);
  const elementRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const tabListRef = (node: HTMLElement | null): void => {
    if (observerRef.current && elementRef.current) {
      observerRef.current.unobserve(elementRef.current);
    }

    elementRef.current = node;

    if (node && observerRef.current) {
      observerRef.current.observe(node);
    }
  };

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const width =
          entry.contentRect.width - (hasAddButton ? ADD_BUTTON_WIDTH : 0);
        setAvailableWidth(Math.max(0, width));
      });
    });

    observerRef.current = observer;

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      observer.disconnect();
      observerRef.current = null;
    };
  }, [hasAddButton]);

  const visibleServers = computeVisibleServers(
    availableWidth,
    servers,
    activeUrl
  );

  const compact = computeIsCompact(availableWidth, visibleServers.length);

  return { visibleServers, compact, tabListRef };
};
