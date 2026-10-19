import { createSelector } from 'reselect';

import type { Server, UserPresence } from '../servers/common';
import type { RootState } from '../store/rootReducer';

export type Selector<T> = (state: RootState) => T;
export type RootSelector<T extends keyof RootState> = Selector<RootState[T]>;

export const selectGlobalBadge = createSelector(
  ({ servers }: RootState) => servers,
  (servers): Server['badge'] => {
    const badges = servers.map(({ badge }) => badge);

    const mentionCount = badges
      .filter((badge): badge is number => Number.isInteger(badge))
      .reduce<number>((sum, count: number) => sum + count, 0);

    return (
      mentionCount || (badges.some((badge) => !!badge) && '•') || undefined
    );
  }
);

export const selectIsTrayIconUnreadCounterEnabled = ({
  isTrayIconUnreadCounterEnabled,
}: RootState): boolean => isTrayIconUnreadCounterEnabled;

export const selectIsMenuBarUnreadCountEnabled = ({
  isMenuBarUnreadCountEnabled,
}: RootState): boolean => isMenuBarUnreadCountEnabled;

export const selectGlobalBadgeText = createSelector(
  selectGlobalBadge,
  (badge) => {
    if (badge === '•') {
      return '•';
    }

    if (Number.isInteger(badge)) {
      return String(badge);
    }

    return '';
  }
);

const isBadgeCount = (badge: Server['badge']): badge is number =>
  Number.isInteger(badge);

export const selectGlobalBadgeCount = createSelector(
  selectGlobalBadge,
  (badge): number => (isBadgeCount(badge) ? badge : 0)
);

export type ActiveServerPresence = {
  url?: string;
  title?: string;
  presence?: UserPresence;
  statusText?: string;
  statusExpiresAt?: string;
  availableStatuses?: UserPresence[];
  customStatuses?: Server['presenceCustomStatuses'];
  connection?: 'connected' | 'connecting' | 'disconnected';
  supported?: boolean;
  loggedIn?: boolean;
  failed?: boolean;
  hasServers: boolean;
  isAddingServer: boolean;
};

const toHref = (url: string): string => {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
};

export const selectActiveServerPresence = createSelector(
  ({ servers }: RootState) => servers,
  ({ currentView }: RootState) => currentView,
  ({ isPresenceDisconnectionSimulated }: RootState) =>
    isPresenceDisconnectionSimulated,
  (
    servers,
    currentView,
    isPresenceDisconnectionSimulated
  ): ActiveServerPresence => {
    const hasServers = servers.length > 0;
    const isAddingServer = currentView === 'add-new-server';

    if (typeof currentView !== 'object' || !currentView.url) {
      return { hasServers, isAddingServer };
    }

    const currentViewHref = toHref(currentView.url);
    const activeServer = servers.find(
      (server) => toHref(server.url) === currentViewHref
    );

    if (!activeServer) {
      return { hasServers, isAddingServer };
    }

    return {
      url: activeServer.url,
      title: activeServer.title,
      presence: activeServer.presence,
      statusText: activeServer.presenceStatusText,
      statusExpiresAt: activeServer.presenceStatusExpiresAt,
      availableStatuses: activeServer.presenceAvailableStatuses,
      customStatuses: activeServer.presenceCustomStatuses,
      connection: isPresenceDisconnectionSimulated
        ? 'disconnected'
        : activeServer.presenceConnection,
      supported: activeServer.presenceSupported,
      loggedIn: activeServer.userLoggedIn,
      failed: activeServer.failed,
      hasServers,
      isAddingServer,
    };
  }
);
