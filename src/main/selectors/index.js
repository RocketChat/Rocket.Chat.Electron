import { createSelector, createSelectorCreator, defaultMemoize } from 'reselect';
import { app, webContents } from 'electron';

const isArrayEquals = (a, b) => Object.is(a, b) || (a.length === b.length && a.every((x, i) => Object.is(x, b[i])));

const createArraySelector = createSelectorCreator(defaultMemoize, isArrayEquals);

export const selectAppName = () => app.name;

export const selectIsMenuBarEnabled = ({ isMenuBarEnabled }) => isMenuBarEnabled;
export const selectIsSideBarEnabled = ({ isSideBarEnabled }) => isSideBarEnabled;
export const selectIsTrayIconEnabled = ({ isTrayIconEnabled }) => isTrayIconEnabled;
export const selectFocusedWebContentsId = ({ focusedWebContentsId }) => focusedWebContentsId;
export const selectEditFlags = ({ editFlags }) => editFlags;
export const selectServers = ({ servers }) => servers;
export const selectMainWindowState = ({ mainWindowState }) => mainWindowState;
export const selectCurrentServerUrl = ({ currentServerUrl }) => currentServerUrl;
export const selectIsShowWindowOnUnreadChangedEnabled = ({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled;

export const selectBadges = createArraySelector(selectServers, (servers) => servers.map(({ badge }) => badge));

export const selectGlobalBadge = createSelector(selectBadges, (badges) => {
	const mentionCount = badges
		.filter((badge) => Number.isInteger(badge))
		.reduce((sum, count) => sum + count, 0);
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

export const selectGlobalBadgeCount = createSelector(selectGlobalBadge, (badge) =>
	(Number.isInteger(badge) ? badge : 0));

export const selectFocusedWebContents = createSelector(selectFocusedWebContentsId, (focusedWebContentsId) =>
	(focusedWebContentsId > -1 ? webContents.fromId(focusedWebContentsId) : null));

export const selectCanUndo = createSelector(selectEditFlags, ({ canUndo }) => canUndo);
export const selectCanRedo = createSelector(selectEditFlags, ({ canRedo }) => canRedo);
export const selectCanCut = createSelector(selectEditFlags, ({ canCut }) => canCut);
export const selectCanCopy = createSelector(selectEditFlags, ({ canCopy }) => canCopy);
export const selectCanPaste = createSelector(selectEditFlags, ({ canPaste }) => canPaste);
export const selectCanSelectAll = createSelector(selectEditFlags, ({ canSelectAll }) => canSelectAll);

export const selectIsFullScreenEnabled = createSelector(selectMainWindowState, ({ fullscreen }) => fullscreen);
