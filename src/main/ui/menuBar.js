import { Menu, app } from 'electron';
import { t } from 'i18next';
import { channel } from 'redux-saga';
import { getContext, put, takeEvery, call } from 'redux-saga/effects';
import { createSelector } from 'reselect';

import {
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	MENU_BAR_DISABLE_GPU,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	MENU_BAR_OPEN_URL_CLICKED,
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_RELOAD_APP_CLICKED,
	MENU_BAR_RELOAD_SERVER_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	MENU_BAR_RESET_ZOOM_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
	MENU_BAR_TOGGLE_DEVTOOLS_CLICKED,
	MENU_BAR_TOGGLE_IS_FULL_SCREEN_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
	MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
	MENU_BAR_ZOOM_IN_CLICKED,
	MENU_BAR_ZOOM_OUT_CLICKED,
} from '../../actions';
import {
	selectCanCopy,
	selectCanCut,
	selectCanPaste,
	selectCanRedo,
	selectCanSelectAll,
	selectCanUndo,
	selectCurrentServerUrl,
	selectFocusedWebContents,
	selectIsFullScreenEnabled,
	selectIsMenuBarEnabled,
	selectIsShowWindowOnUnreadChangedEnabled,
	selectIsSideBarEnabled,
	selectIsTrayIconEnabled,
	selectServers,
	selectIsServerSelected,
} from '../selectors';
import { watchValue } from '../sagas/utils';
import { getPlatform } from '../app';

const eventsChannel = channel();

const createActionDispatcher = (actionCreator) => (...args) => {
	eventsChannel.put(function *click() {
		const action = actionCreator(...args);
		if (action) {
			yield put(action);
		}
	});
};

const selectAppMenuTemplate = createSelector([], () => ({
	label: process.platform === 'darwin' ? app.name : t('menus.fileMenu'),
	submenu: [
		...process.platform === 'darwin' ? [
			{
				id: MENU_BAR_ABOUT_CLICKED,
				label: t('menus.about', { appName: app.name }),
				click: createActionDispatcher(() => ({ type: MENU_BAR_ABOUT_CLICKED })),
			},
			{ type: 'separator' },
			{
				label: t('menus.services'),
				role: 'services',
			},
			{ type: 'separator' },
			{
				label: t('menus.hide', { appName: app.name }),
				role: 'hide',
			},
			{
				label: t('menus.hideOthers'),
				role: 'hideothers',
			},
			{
				label: t('menus.unhide'),
				role: 'unhide',
			},
			{ type: 'separator' },
		] : [],
		...process.platform !== 'darwin' ? [
			{
				label: t('menus.addNewServer'),
				accelerator: 'CommandOrControl+N',
				click: createActionDispatcher(() => ({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED })),
			},
			{ type: 'separator' },
		] : [],
		{
			label: t('Disable GPU'),
			enabled: !app.commandLine.hasSwitch('disable-gpu'),
			click: createActionDispatcher(() => ({ type: MENU_BAR_DISABLE_GPU })),
		},
		{ type: 'separator' },
		{
			label: t('menus.quit', { appName: app.name }),
			accelerator: 'CommandOrControl+Q',
			click: createActionDispatcher(() => ({ type: MENU_BAR_QUIT_CLICKED })),
		},
	],
}));

const selectEditMenuTemplate = createSelector([
	selectFocusedWebContents,
	selectCanUndo,
	selectCanRedo,
	selectCanCut,
	selectCanCopy,
	selectCanPaste,
	selectCanSelectAll,
], (focusedWebContents, canUndo, canRedo, canCut, canCopy, canPaste, canSelectAll) => ({
	label: t('menus.editMenu'),
	submenu: [
		{
			label: t('menus.undo'),
			accelerator: 'CommandOrControl+Z',
			enabled: !!focusedWebContents && canUndo,
			click: () => focusedWebContents.undo(),
		},
		{
			label: t('menus.redo'),
			accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
			enabled: !!focusedWebContents && canRedo,
			click: () => focusedWebContents.redo(),
		},
		{ type: 'separator' },
		{
			label: t('menus.cut'),
			accelerator: 'CommandOrControl+X',
			enabled: !!focusedWebContents && canCut,
			click: () => focusedWebContents.cut(),
		},
		{
			label: t('menus.copy'),
			accelerator: 'CommandOrControl+C',
			enabled: !!focusedWebContents && canCopy,
			click: () => focusedWebContents.copy(),
		},
		{
			label: t('menus.paste'),
			accelerator: 'CommandOrControl+V',
			enabled: !!focusedWebContents && canPaste,
			click: () => focusedWebContents.paste(),
		},
		{
			label: t('menus.selectAll'),
			accelerator: 'CommandOrControl+A',
			enabled: !!focusedWebContents && canSelectAll,
			click: () => focusedWebContents.selectAll(),
		},
	],
}));

const selectViewMenuTemplate = createSelector([
	selectIsServerSelected,
	selectIsSideBarEnabled,
	selectIsTrayIconEnabled,
	selectIsMenuBarEnabled,
	selectIsFullScreenEnabled,
], (isServerSelected, isSideBarEnabled, isTrayIconEnabled, isMenuBarEnabled, isFullScreenEnabled) => ({
	label: t('menus.viewMenu'),
	submenu: [
		{
			label: t('menus.reload'),
			accelerator: 'CommandOrControl+R',
			enabled: isServerSelected,
			click: createActionDispatcher(() => ({ type: MENU_BAR_RELOAD_SERVER_CLICKED })),
		},
		{
			label: t('menus.reloadIgnoringCache'),
			enabled: isServerSelected,
			click: createActionDispatcher(() => ({
				type: MENU_BAR_RELOAD_SERVER_CLICKED,
				payload: { ignoringCache: true },
			})),
		},
		{
			label: t('menus.openDevTools'),
			enabled: isServerSelected,
			accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
			click: createActionDispatcher(() => ({ type: MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED })),
		},
		{ type: 'separator' },
		{
			label: t('menus.back'),
			enabled: isServerSelected,
			accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
			click: createActionDispatcher(() => ({ type: MENU_BAR_GO_BACK_CLICKED })),
		},
		{
			label: t('menus.forward'),
			enabled: isServerSelected,
			accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
			click: createActionDispatcher(() => ({ type: MENU_BAR_GO_FORWARD_CLICKED })),
		},
		{ type: 'separator' },
		{
			label: t('menus.showTrayIcon'),
			type: 'checkbox',
			checked: isTrayIconEnabled,
			click: createActionDispatcher(({ checked }) => ({
				type: MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
				payload: checked,
			})),
		},
		...process.platform === 'darwin' ? [
			{
				label: t('menus.showFullScreen'),
				type: 'checkbox',
				checked: isFullScreenEnabled,
				accelerator: 'Control+Command+F',
				click: createActionDispatcher(({ checked }) => ({
					type: MENU_BAR_TOGGLE_IS_FULL_SCREEN_ENABLED_CLICKED,
					payload: checked,
				})),
			},
		] : [],
		...process.platform !== 'darwin' ? [
			{
				label: t('menus.showMenuBar'),
				type: 'checkbox',
				checked: isMenuBarEnabled,
				click: createActionDispatcher(({ checked }) => ({
					type: MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
					payload: checked,
				})),
			},
		] : [],
		{
			label: t('menus.showServerList'),
			type: 'checkbox',
			checked: isSideBarEnabled,
			click: createActionDispatcher(({ checked }) => ({
				type: MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
				payload: checked,
			})),
		},
		{ type: 'separator' },
		{
			label: t('menus.resetZoom'),
			accelerator: 'CommandOrControl+0',
			click: createActionDispatcher(() => ({ type: MENU_BAR_RESET_ZOOM_CLICKED })),
		},
		{
			label: t('menus.zoomIn'),
			accelerator: 'CommandOrControl+Plus',
			click: createActionDispatcher(() => ({ type: MENU_BAR_ZOOM_IN_CLICKED })),
		},
		{
			label: t('menus.zoomOut'),
			accelerator: 'CommandOrControl+-',
			click: createActionDispatcher(() => ({ type: MENU_BAR_ZOOM_OUT_CLICKED })),
		},
	],
}));

const selectWindowMenuTemplate = createSelector([
	selectServers,
	selectCurrentServerUrl,
	selectIsShowWindowOnUnreadChangedEnabled,
], (servers, currentServerUrl, isShowWindowOnUnreadChangedEnabled) => ({
	label: t('menus.windowMenu'),
	role: 'window',
	submenu: [
		...process.platform === 'darwin' ? [
			{
				label: t('menus.addNewServer'),
				accelerator: 'CommandOrControl+N',
				click: createActionDispatcher(() => ({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED })),
			},
			{ type: 'separator' },
		] : [],
		...servers.length > 0 ? [
			...servers.map((server, i) => ({
				type: currentServerUrl ? 'checkbox' : 'normal',
				label: server.title.replace(/&/g, '&&'),
				checked: currentServerUrl === server.url,
				accelerator: `CommandOrControl+${ i + 1 }`,
				click: createActionDispatcher(() => ({
					type: MENU_BAR_SELECT_SERVER_CLICKED,
					payload: server.url,
				})),
			})),
			{ type: 'separator' },
		] : [],
		{
			type: 'checkbox',
			label: t('menus.showOnUnreadMessage'),
			checked: isShowWindowOnUnreadChangedEnabled,
			click: createActionDispatcher(({ checked }) => ({
				type: MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
				payload: checked,
			})),
		},
		{ type: 'separator' },
		{
			role: 'minimize',
			label: t('menus.minimize'),
			accelerator: 'CommandOrControl+M',
		},
		{
			role: 'close',
			label: t('menus.close'),
			accelerator: 'CommandOrControl+W',
		},
	],
}));

const selectHelpMenuTemplate = createSelector([], () => ({
	label: t('menus.helpMenu'),
	role: 'help',
	submenu: [
		{
			label: t('menus.documentation'),
			click: createActionDispatcher(() => ({
				type: MENU_BAR_OPEN_URL_CLICKED,
				payload: 'https://rocket.chat/docs',
			})),
		},
		{
			label: t('menus.reportIssue'),
			click: createActionDispatcher(() => ({
				type: MENU_BAR_OPEN_URL_CLICKED,
				payload: 'https://github.com/RocketChat/Rocket.Chat/issues/new',
			})),
		},
		{ type: 'separator' },
		{
			label: t('menus.reload'),
			accelerator: 'CommandOrControl+Shift+R',
			click: createActionDispatcher(() => ({ type: MENU_BAR_RELOAD_APP_CLICKED })),
		},
		{
			label: t('menus.toggleDevTools'),
			click: createActionDispatcher(() => ({ type: MENU_BAR_TOGGLE_DEVTOOLS_CLICKED })),
		},
		{ type: 'separator' },
		{
			label: t('menus.clearTrustedCertificates'),
			click: createActionDispatcher(() => ({ type: MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED })),
		},
		{
			label: t('menus.resetAppData'),
			click: createActionDispatcher(() => ({ type: MENU_BAR_RESET_APP_DATA_CLICKED })),
		},
		{ type: 'separator' },
		{
			label: t('menus.learnMore'),
			click: createActionDispatcher(() => ({
				type: MENU_BAR_OPEN_URL_CLICKED,
				payload: 'https://rocket.chat',
			})),
		},
		...process.platform !== 'darwin' ? [
			{
				label: t('menus.about', { appName: app.name }),
				click: createActionDispatcher(() => ({ type: MENU_BAR_ABOUT_CLICKED })),
			},
		] : [],
	],
}));

const selectMenuBarTemplate = createSelector([
	selectAppMenuTemplate,
	selectEditMenuTemplate,
	selectViewMenuTemplate,
	selectWindowMenuTemplate,
	selectHelpMenuTemplate,
], (...menus) => menus);

function *updateApplicationMenu(menu) {
	yield call(Menu.setApplicationMenu, menu);
}

function *updateRootWindowMenu(menu) {
	yield call(Menu.setApplicationMenu, null);
	const rootWindow = yield getContext('rootWindow');
	yield call(rootWindow.setMenu.bind(rootWindow), menu);
}

function *watchUpdates() {
	yield watchValue(selectMenuBarTemplate, function *([menuBarTemplate]) {
		const menu = yield call(Menu.buildFromTemplate, menuBarTemplate);
		const platform = yield call(getPlatform);

		if (platform === 'darwin') {
			yield *updateApplicationMenu(menu);
			return;
		}

		yield *updateRootWindowMenu(menu);
	});
}

function *watchEvents() {
	yield takeEvery(eventsChannel, function *(saga) {
		yield *saga();
	});
}

export function *setupMenuBar() {
	yield *watchUpdates();
	yield *watchEvents();
}
