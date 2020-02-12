import { remote } from 'electron';
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { all, call, put, select, take, takeEvery } from 'redux-saga/effects';
import { useTranslation } from 'react-i18next';

import {
	DEEP_LINK_TRIGGERED,
	MAIN_WINDOW_INSTALL_UPDATE_CLICKED,
	MAIN_WINDOW_STATE_CHANGED,
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_RELOAD_APP_CLICKED,
	MENU_BAR_RELOAD_SERVER_CLICKED,
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
	SERVERS_READY,
	SPELL_CHECKING_READY,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	TRAY_ICON_CREATED,
	TRAY_ICON_DESTROYED,
	TRAY_ICON_TOGGLE_CLICKED,
	UPDATES_READY,
	UPDATES_UPDATE_DOWNLOADED,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_UNREAD_CHANGED,
} from '../../actions';
import { getAppIconPath, getTrayIconPath } from '../../icons';
import { useSaga } from '../SagaMiddlewareProvider';
import { WindowDragBar, Wrapper, GlobalStyles } from './styles';
import { readConfigurationFile, keepStoreValuePersisted } from '../../sagaUtils';
import { readFromStorage } from '../../localStorage';

const useAppEvents = (browserWindow, windowStateRef) => {
	useEffect(() => {
		const handleActivate = () => {
			browserWindow.show();
		};

		const handleAppBeforeQuit = () => {
			remote.app.removeListener('before-quit', handleAppBeforeQuit);
			browserWindow.destroy();
		};

		const handleAppSecondInstance = () => {
			if (process.platform === 'win32') {
				if (browserWindow.isVisible()) {
					browserWindow.focus();
				} else if (browserWindow.isMinimized()) {
					browserWindow.restore();
				} else {
					browserWindow.show();
				}

				return;
			}

			if (browserWindow.isMinimized()) {
				browserWindow.restore();
				return;
			}

			browserWindow.show();
			browserWindow.focus();
		};

		remote.app.addListener('activate', handleActivate);
		remote.app.addListener('before-quit', handleAppBeforeQuit);
		remote.app.addListener('second-instance', handleAppSecondInstance);

		return () => {
			remote.app.removeListener('before-quit', handleAppBeforeQuit);
			remote.app.removeListener('activate', handleActivate);
			remote.app.removeListener('second-instance', handleAppSecondInstance);
		};
	}, [browserWindow, windowStateRef]);
};

const useWindowStateUpdates = (browserWindow, windowStateRef, dispatch) => {
	const fetchAndSaveTimerRef = useRef();

	useEffect(() => {
		const fetchAndDispatchWindowState = () => {
			const focused = browserWindow.isFocused();
			const visible = browserWindow.isVisible();
			const maximized = browserWindow.isMaximized();
			const minimized = browserWindow.isMinimized();
			const fullscreen = browserWindow.isFullScreen();
			const normal = browserWindow.isNormal();
			const bounds = browserWindow.getNormalBounds();

			dispatch({
				type: MAIN_WINDOW_STATE_CHANGED,
				payload: {
					focused,
					visible,
					maximized,
					minimized,
					fullscreen,
					normal,
					bounds,
				},
			});
		};

		browserWindow.addListener('show', fetchAndDispatchWindowState);
		browserWindow.addListener('hide', fetchAndDispatchWindowState);
		browserWindow.addListener('focus', fetchAndDispatchWindowState);
		browserWindow.addListener('blur', fetchAndDispatchWindowState);
		browserWindow.addListener('maximize', fetchAndDispatchWindowState);
		browserWindow.addListener('unmaximize', fetchAndDispatchWindowState);
		browserWindow.addListener('minimize', fetchAndDispatchWindowState);
		browserWindow.addListener('restore', fetchAndDispatchWindowState);
		browserWindow.addListener('resize', fetchAndDispatchWindowState);
		browserWindow.addListener('move', fetchAndDispatchWindowState);

		return () => {
			browserWindow.removeListener('show', fetchAndDispatchWindowState);
			browserWindow.removeListener('hide', fetchAndDispatchWindowState);
			browserWindow.removeListener('focus', fetchAndDispatchWindowState);
			browserWindow.removeListener('blur', fetchAndDispatchWindowState);
			browserWindow.removeListener('maximize', fetchAndDispatchWindowState);
			browserWindow.removeListener('unmaximize', fetchAndDispatchWindowState);
			browserWindow.removeListener('minimize', fetchAndDispatchWindowState);
			browserWindow.removeListener('restore', fetchAndDispatchWindowState);
			browserWindow.removeListener('resize', fetchAndDispatchWindowState);
			browserWindow.removeListener('move', fetchAndDispatchWindowState);
		};
	}, [browserWindow, windowStateRef, fetchAndSaveTimerRef, dispatch]);
};

const useWindowClosing = (browserWindow, windowStateRef, hideOnClose) => {
	useEffect(() => {
		const handleClose = async () => {
			if (browserWindow.isFullScreen()) {
				await new Promise((resolve) => browserWindow.once('leave-full-screen', resolve));
				browserWindow.setFullScreen(false);
			}

			browserWindow.blur();

			if (process.platform === 'darwin' || hideOnClose) {
				browserWindow.hide();
			} else if (process.platform === 'win32') {
				browserWindow.minimize();
			} else {
				remote.app.quit();
			}
		};
		browserWindow.addListener('close', handleClose);

		return () => {
			browserWindow.removeListener('close', handleClose);
		};
	}, [browserWindow, windowStateRef, hideOnClose]);
};

export function MainWindow({
	browserWindow = remote.getCurrentWindow(),
	children,
}) {
	const badge = useSelector(({ isTrayIconEnabled, servers }) => {
		if (isTrayIconEnabled) {
			return undefined;
		}

		const badges = servers.map(({ badge }) => badge);
		const mentionCount = badges
			.filter((badge) => Number.isInteger(badge))
			.reduce((sum, count) => sum + count, 0);
		return mentionCount || (badges.some((badge) => !!badge) && '•') || null;
	});

	useLayoutEffect(() => {
		const styleSrc = `${ remote.app.getAppPath() }/app/icons/rocketchat.css`;
		const linkElement = document.createElement('link');
		linkElement.rel = 'stylesheet';
		linkElement.href = styleSrc;
		document.head.append(linkElement);
	}, []);

	const { t } = useTranslation();
	const dispatch = useDispatch();
	const windowStateRef = useRef({});
	const [loading, setLoading] = useState(true);
	const [hideOnClose, setHideOnClose] = useState(false);

	useAppEvents(browserWindow, windowStateRef);
	useWindowStateUpdates(browserWindow, windowStateRef, dispatch);
	useWindowClosing(browserWindow, windowStateRef, hideOnClose);

	useEffect(() => {
		if (process.platform !== 'linux' && process.platform !== 'win32') {
			return;
		}

		const image = badge === undefined ? getAppIconPath() : getTrayIconPath({ badge });
		browserWindow.setIcon(image);
	}, [badge, browserWindow]);

	useEffect(() => {
		if (process.platform !== 'win32') {
			return;
		}

		const count = Number.isInteger(badge) ? badge : 0;
		browserWindow.flashFrame(!browserWindow.isFocused() && count > 0);
	}, [badge, browserWindow]);

	useSaga(function *() {
		yield all([
			take(SERVERS_READY),
			take(SPELL_CHECKING_READY),
			take(UPDATES_READY),
		]);
		setLoading(false);
	}, []);

	useSaga(function *() {
		yield takeEvery([
			DEEP_LINK_TRIGGERED,
			MENU_BAR_ABOUT_CLICKED,
			MENU_BAR_ADD_NEW_SERVER_CLICKED,
			MENU_BAR_GO_BACK_CLICKED,
			MENU_BAR_GO_FORWARD_CLICKED,
			MENU_BAR_RELOAD_SERVER_CLICKED,
			MENU_BAR_SELECT_SERVER_CLICKED,
			MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED,
			MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
			MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED,
			MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
			TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
			TOUCH_BAR_SELECT_SERVER_TOUCHED,
			WEBVIEW_FOCUS_REQUESTED,
		], function *() {
			browserWindow.show();
		});

		yield takeEvery(MENU_BAR_RESET_ZOOM_CLICKED, function *() {
			browserWindow.show();
			browserWindow.webContents.zoomLevel = 0;
		});

		yield takeEvery(MENU_BAR_ZOOM_IN_CLICKED, function *() {
			browserWindow.show();
			browserWindow.webContents.zoomLevel++;
		});

		yield takeEvery(MENU_BAR_ZOOM_OUT_CLICKED, function *() {
			browserWindow.show();
			browserWindow.webContents.zoomLevel--;
		});

		yield takeEvery(MENU_BAR_RELOAD_APP_CLICKED, function *() {
			browserWindow.show();
			browserWindow.reload();
		});

		yield takeEvery(MENU_BAR_TOGGLE_DEVTOOLS_CLICKED, function *() {
			browserWindow.show();
			browserWindow.toggleDevTools();
		});

		yield takeEvery(MENU_BAR_TOGGLE_IS_FULL_SCREEN_ENABLED_CLICKED, function *({ payload: enabled }) {
			browserWindow.show();
			browserWindow.setFullScreen(enabled);
		});

		yield takeEvery(TRAY_ICON_CREATED, function *() {
			setHideOnClose(true);
		});

		yield takeEvery(TRAY_ICON_DESTROYED, function *() {
			setHideOnClose(false);
		});

		yield takeEvery(TRAY_ICON_TOGGLE_CLICKED, function *({ payload: visible }) {
			if (visible) {
				browserWindow.show();
			} else {
				browserWindow.hide();
			}
		});

		yield takeEvery(WEBVIEW_UNREAD_CHANGED, function *({ payload: badge }) {
			const isShowWindowOnUnreadChangedEnabled = yield select(({ isShowWindowOnUnreadChangedEnabled }) =>
				isShowWindowOnUnreadChangedEnabled);
			if (!isShowWindowOnUnreadChangedEnabled || browserWindow.isFocused() || typeof badge !== 'number') {
				return;
			}

			browserWindow.once('focus', () => {
				browserWindow.flashFrame(false);
			});
			browserWindow.showInactive();
			browserWindow.flashFrame(true);
		});

		yield takeEvery(UPDATES_UPDATE_DOWNLOADED, function *() {
			const { response } = yield call(remote.dialog.showMessageBox, remote.getCurrentWindow(), {
				type: 'question',
				title: t('dialog.updateReady.title'),
				message: t('dialog.updateReady.message'),
				buttons: [
					t('dialog.updateReady.installLater'),
					t('dialog.updateReady.installNow'),
				],
				defaultId: 1,
			});

			if (response === 0) {
				yield call(remote.dialog.showMessageBox, remote.getCurrentWindow(), {
					type: 'info',
					title: t('dialog.updateInstallLater.title'),
					message: t('dialog.updateInstallLater.message'),
					buttons: [t('dialog.updateInstallLater.ok')],
					defaultId: 0,
				});
				return;
			}

			remote.getCurrentWindow().removeAllListeners();
			remote.app.removeAllListeners('window-all-closed');
			yield put({ type: MAIN_WINDOW_INSTALL_UPDATE_CLICKED });
		});
	}, [browserWindow]);

	useSaga(function *() {
		const isInsideSomeScreen = ({ x, y, width, height }) =>
			remote.screen.getAllDisplays()
				.some(({ bounds }) => x >= bounds.x && y >= bounds.y
				&& x + width <= bounds.x + bounds.width && y + height <= bounds.y + bounds.height,
				);

		const loadUserMainWindowState = async () => {
			const userMainWindowState = await readConfigurationFile('main-window-state.json',
				{ appData: false, purgeAfter: true });

			if (!userMainWindowState) {
				return null;
			}

			const {
				x,
				y,
				width,
				height,
				isMaximized,
				isMinimized,
				isHidden,
			} = userMainWindowState;

			return {
				focused: true,
				visible: !isHidden,
				maximized: isMaximized,
				minimized: isMinimized,
				fullscreen: false,
				normal: !isMinimized && !isMaximized,
				bounds: { x, y, width, height },
			};
		};

		function *loadMainWindowState() {
			const userMainWindowState = yield call(loadUserMainWindowState);
			if (userMainWindowState) {
				return userMainWindowState;
			}

			const initialMainWindowState = yield select(({ mainWindowState }) => mainWindowState);

			return readFromStorage('mainWindowState', initialMainWindowState);
		}

		const mainWindowState = yield *loadMainWindowState();

		if (!isInsideSomeScreen(mainWindowState.bounds)) {
			const { bounds } = remote.screen.getPrimaryDisplay();
			mainWindowState.bounds.x = (bounds.width - mainWindowState.bounds.width) / 2;
			mainWindowState.bounds.y = (bounds.height - mainWindowState.bounds.width) / 2;
		}

		if (browserWindow.isVisible()) {
			return;
		}

		browserWindow.setBounds(mainWindowState.bounds);

		if (mainWindowState.maximized) {
			browserWindow.maximize();
		}

		if (mainWindowState.minimized) {
			browserWindow.minimize();
		}

		if (mainWindowState.fullscreen) {
			browserWindow.setFullScreen(true);
		}

		if (mainWindowState.visible) {
			browserWindow.showInactive();
		}

		if (mainWindowState.focused) {
			browserWindow.focus();
		}

		if (process.env.NODE_ENV === 'development') {
			browserWindow.webContents.openDevTools();
		}

		yield *keepStoreValuePersisted('mainWindowState');
	}, []);

	return <>
		<GlobalStyles />
		<Wrapper>
			{process.platform === 'darwin' && <WindowDragBar />}
			{!loading && children}
		</Wrapper>
	</>;
}
