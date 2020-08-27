import {
  createSelector,
  createStructuredSelector,
} from 'reselect';

import { Server } from './servers/common';
import { RootState } from './store/rootReducer';

export type Selector<T> = (state: RootState) => T;
export type RootSelector<T extends keyof RootState> = Selector<RootState[T]>;

export const selectMainWindowState: RootSelector<'mainWindowState'> = ({ mainWindowState }) => mainWindowState ?? {
  bounds: {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  },
  focused: false,
  fullscreen: false,
  maximized: false,
  minimized: false,
  normal: false,
  visible: false,
};

export const selectGlobalBadge = ({ servers }: RootState): Server['badge'] | null => {
  const badges = servers.map(({ badge }) => badge);

  const mentionCount = badges
    .filter((badge) => Number.isInteger(badge))
    .reduce<number>((sum, count: number) => sum + count, 0);

  return mentionCount || (badges.some((badge) => !!badge) && '•') || null;
};

export const selectGlobalBadgeText = createSelector(selectGlobalBadge, (badge) => {
  if (badge === '•') {
    return '•';
  }

  if (Number.isInteger(badge)) {
    return String(badge);
  }

  return '';
});

const isBadgeCount = (badge: Server['badge']): badge is number =>
  Number.isInteger(badge);

export const selectGlobalBadgeCount = createSelector(selectGlobalBadge, (badge): number =>
  (isBadgeCount(badge) ? badge : 0));

export const selectPersistableValues = createStructuredSelector({
  currentServerUrl: ({ currentServerUrl }) => currentServerUrl,
  doCheckForUpdatesOnStartup: ({ doCheckForUpdatesOnStartup }) => doCheckForUpdatesOnStartup,
  isMenuBarEnabled: ({ isMenuBarEnabled }) => isMenuBarEnabled,
  isShowWindowOnUnreadChangedEnabled: ({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled,
  isSideBarEnabled: ({ isSideBarEnabled }) => isSideBarEnabled,
  isTrayIconEnabled: ({ isTrayIconEnabled }) => isTrayIconEnabled,
  mainWindowState: ({ mainWindowState }) => mainWindowState,
  servers: ({ servers }) => servers,
  spellCheckingDictionaries: ({ spellCheckingDictionaries }) => spellCheckingDictionaries,
  skippedUpdateVersion: ({ skippedUpdateVersion }) => skippedUpdateVersion,
  trustedCertificates: ({ trustedCertificates }) => trustedCertificates,
  isEachUpdatesSettingConfigurable: ({ isEachUpdatesSettingConfigurable }) => isEachUpdatesSettingConfigurable,
  isUpdatingEnabled: ({ isUpdatingEnabled }) => isUpdatingEnabled,
});
