import { webContents } from 'electron';
import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
  createStructuredSelector,
} from 'reselect';

import { rootReducer } from './reducers';
import { Server } from './structs/servers';

const isArrayEquals = <T>(a: T, b: T, _index: number): boolean =>
  Object.is(a, b) || (
    Array.isArray(a)
		&& Array.isArray(b)
		&& a.length === b.length
		&& a.every((_x, i) => Object.is(a[i], b[i]))
  );

const createArraySelector = createSelectorCreator(defaultMemoize, isArrayEquals);

type State = ReturnType<typeof rootReducer>;

type DirectSelector<T extends keyof State> = (state: State) => State[T];

export const selectAppPath: DirectSelector<'appPath'> = ({ appPath }) => appPath;
export const selectAppVersion: DirectSelector<'appVersion'> = ({ appVersion }) => appVersion;
export const selectClientCertificates: DirectSelector<'clientCertificates'> = ({ clientCertificates }) => clientCertificates ?? [];
export const selectCurrentServerUrl: DirectSelector<'currentServerUrl'> = ({ currentServerUrl }) => currentServerUrl ?? null;
export const selectDoCheckForUpdatesOnStartup: DirectSelector<'doCheckForUpdatesOnStartup'> = ({ doCheckForUpdatesOnStartup }: State): State['doCheckForUpdatesOnStartup'] => doCheckForUpdatesOnStartup ?? true;
export const selectEditFlags: DirectSelector<'editFlags'> = ({ editFlags }) => editFlags ?? {
  canCopy: false,
  canCut: false,
  canDelete: false,
  canPaste: false,
  canRedo: false,
  canSelectAll: false,
  canUndo: false,
};
export const selectFocusedWebContentsId: DirectSelector<'focusedWebContentsId'> = ({ focusedWebContentsId }) => focusedWebContentsId ?? -1;
export const selectIsCheckingForUpdates: DirectSelector<'isCheckingForUpdates'> = ({ isCheckingForUpdates }) => isCheckingForUpdates ?? false;
export const selectIsEachUpdatesSettingConfigurable: DirectSelector<'isEachUpdatesSettingConfigurable'> = ({ isEachUpdatesSettingConfigurable }) => isEachUpdatesSettingConfigurable ?? false;
export const selectIsMenuBarEnabled: DirectSelector<'isMenuBarEnabled'> = ({ isMenuBarEnabled }) => isMenuBarEnabled ?? true;
export const selectIsMessageBoxFocused: DirectSelector<'isMessageBoxFocused'> = ({ isMessageBoxFocused }) => isMessageBoxFocused ?? false;
export const selectIsShowWindowOnUnreadChangedEnabled: DirectSelector<'isShowWindowOnUnreadChangedEnabled'> = ({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled ?? false;
export const selectIsSideBarEnabled: DirectSelector<'isSideBarEnabled'> = ({ isSideBarEnabled }) => isSideBarEnabled ?? true;
export const selectIsTrayIconEnabled: DirectSelector<'isTrayIconEnabled'> = ({ isTrayIconEnabled }) => isTrayIconEnabled ?? true;
export const selectIsUpdatingAllowed: DirectSelector<'isUpdatingAllowed'> = ({ isUpdatingAllowed }) => isUpdatingAllowed ?? true;
export const selectIsUpdatingEnabled: DirectSelector<'isUpdatingEnabled'> = ({ isUpdatingEnabled }) => isUpdatingEnabled ?? true;
export const selectMainWindowState: DirectSelector<'mainWindowState'> = ({ mainWindowState }) => mainWindowState ?? {
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
export const selectNewUpdateVersion: DirectSelector<'newUpdateVersion'> = ({ newUpdateVersion }) => newUpdateVersion ?? null;
export const selectOpenDialog: DirectSelector<'openDialog'> = ({ openDialog }) => openDialog ?? null;
export const selectUpdateError: DirectSelector<'updateError'> = ({ updateError }) => updateError;
export const selectServers: DirectSelector<'servers'> = ({ servers }) => servers ?? [];
export const selectSkippedUpdateVersion: DirectSelector<'skippedUpdateVersion'> = ({ skippedUpdateVersion }) => skippedUpdateVersion ?? null;
export const selectSpellCheckingDictionaries: DirectSelector<'spellCheckingDictionaries'> = ({ spellCheckingDictionaries }) => spellCheckingDictionaries ?? [];
export const selectTrustedCertificates: DirectSelector<'trustedCertificates'> = ({ trustedCertificates }) => trustedCertificates ?? {};

export const selectBadges = createArraySelector(selectServers, (servers) => servers.map(({ badge }) => badge));

export const selectGlobalBadge = createSelector(selectBadges, (badges) => {
  const mentionCount = badges
    .filter((badge) => Number.isInteger(badge))
    .reduce<number>((sum, count: number) => sum + count, 0);
  return mentionCount || (badges.some((badge) => !!badge) && '•') || null;
});

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

export const selectFocusedWebContents = createSelector(selectFocusedWebContentsId, (focusedWebContentsId) =>
  (focusedWebContentsId > -1 ? webContents.fromId(focusedWebContentsId) : null));

export const selectCanUndo = createSelector(selectEditFlags, ({ canUndo }) => canUndo);
export const selectCanRedo = createSelector(selectEditFlags, ({ canRedo }) => canRedo);
export const selectCanCut = createSelector(selectEditFlags, ({ canCut }) => canCut);
export const selectCanCopy = createSelector(selectEditFlags, ({ canCopy }) => canCopy);
export const selectCanPaste = createSelector(selectEditFlags, ({ canPaste }) => canPaste);
export const selectCanSelectAll = createSelector(selectEditFlags, ({ canSelectAll }) => canSelectAll);

export const selectIsFullScreenEnabled = createSelector(selectMainWindowState, ({ fullscreen }) => fullscreen);

export const selectIsServerSelected = createSelector(selectCurrentServerUrl, (currentServerUrl) => !!currentServerUrl);

export const selectPersistableValues = createStructuredSelector({
  currentServerUrl: selectCurrentServerUrl,
  doCheckForUpdatesOnStartup: selectDoCheckForUpdatesOnStartup,
  isMenuBarEnabled: selectIsMenuBarEnabled,
  isShowWindowOnUnreadChangedEnabled: selectIsShowWindowOnUnreadChangedEnabled,
  isSideBarEnabled: selectIsSideBarEnabled,
  isTrayIconEnabled: selectIsTrayIconEnabled,
  mainWindowState: selectMainWindowState,
  servers: selectServers,
  spellCheckingDictionaries: selectSpellCheckingDictionaries,
  skippedUpdateVersion: selectSkippedUpdateVersion,
  trustedCertificates: selectTrustedCertificates,
  isEachUpdatesSettingConfigurable: selectIsEachUpdatesSettingConfigurable,
  isUpdatingEnabled: selectIsUpdatingEnabled,
});

export const selectIsMainWindowVisible = createSelector(selectMainWindowState, ({ visible }) => visible);

export const selectCurrentServer = ({ servers, currentServerUrl }: State): Server => servers.find(({ url }) => url === currentServerUrl);

export const selectUpdateConfiguration = createStructuredSelector({
  isEachUpdatesSettingConfigurable: selectIsEachUpdatesSettingConfigurable,
  isUpdatingEnabled: selectIsUpdatingEnabled,
  doCheckForUpdatesOnStartup: selectDoCheckForUpdatesOnStartup,
  skippedUpdateVersion: selectSkippedUpdateVersion,
});

export const selectIsSideBarVisible = createSelector([
  selectServers,
  selectIsSideBarEnabled,
], (servers, isSideBarEnabled) => servers.length > 0 && isSideBarEnabled);

export const selectDictionaryName = createSelector([
  selectSpellCheckingDictionaries,
], (spellCheckingDictionaries) =>
  spellCheckingDictionaries.filter(({ enabled }) => enabled).map(({ name }) => name)[0]);
