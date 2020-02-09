import fs from 'fs';
import path from 'path';

import { remote } from 'electron';
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useDispatch } from 'react-redux';
import { call, put, take, takeEvery } from 'redux-saga/effects';
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
	MENU_BAR_TOGGLE_SETTING_CLICKED,
	MENU_BAR_ZOOM_IN_CLICKED,
	MENU_BAR_ZOOM_OUT_CLICKED,
	SERVERS_READY,
	SPELL_CHECKING_ERROR_THROWN,
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

const isInsideSomeScreen = ({ x, y, width, height }) =>
	remote.screen.getAllDisplays()
		.some(({ bounds }) => x >= bounds.x && y >= bounds.y
		&& x + width <= bounds.x + bounds.width && y + height <= bounds.y + bounds.height,
		);

const loadWindowState = async ([width, height]) => {
	try {
		const windowState = {
			width,
			height,
			...JSON.parse(await fs.promises.readFile(path.join(remote.app.getPath('userData'), 'window-state-main.json'), 'utf8')) || {},
		};

		if (!isInsideSomeScreen(windowState)) {
			const { bounds } = remote.screen.getPrimaryDisplay();
			windowState.x = (bounds.width - width) / 2;
			windowState.y = (bounds.height - height) / 2;
			windowState.width = width;
			windowState.height = height;
		}

		return windowState;
	} catch (error) {
		console.error('Failed to load window state');
		console.error(error);
		return { width, height };
	}
};

const saveWindowState = async (windowState) => {
	try {
		await fs.promises.writeFile(path.join(remote.app.getPath('userData'), 'window-state-main.json'), JSON.stringify(windowState), 'utf8');
	} catch (error) {
		console.error('Failed to save window state');
		console.error(error);
	}
};

const applyWindowState = (browserWindow, windowState) => {
	if (browserWindow.isDestroyed()) {
		return;
	}

	if (windowState.x !== undefined && windowState.y !== undefined) {
		browserWindow.setPosition(Math.floor(windowState.x), Math.floor(windowState.y), false);
	}

	if (windowState.width !== undefined && windowState.height !== undefined) {
		browserWindow.setSize(Math.floor(windowState.width), Math.floor(windowState.height), false);
	}

	if (windowState.isMaximized) {
		browserWindow.maximize();
	} else if (windowState.isMinimized) {
		browserWindow.minimize();
	} else {
		browserWindow.restore();
	}

	if (windowState.isHidden) {
		browserWindow.hide();
	} else if (!windowState.isMinimized) {
		browserWindow.show();
	}
};

const fetchWindowState = (browserWindow, windowState) => {
	if (browserWindow.isDestroyed()) {
		return;
	}

	windowState.isMaximized = browserWindow.isMaximized();
	windowState.isMinimized = browserWindow.isMinimized();
	windowState.isHidden = !browserWindow.isMinimized() && !browserWindow.isVisible();

	if (!windowState.isMaximized && !windowState.isHidden) {
		[windowState.x, windowState.y] = browserWindow.getPosition();
		[windowState.width, windowState.height] = browserWindow.getSize();
	}
};

const useAppEvents = (browserWindow, windowStateRef) => {
	useEffect(() => {
		const handleActivate = () => {
			browserWindow.show();
		};

		const handleAppBeforeQuit = () => {
			remote.app.removeListener('before-quit', handleAppBeforeQuit);
			saveWindowState(windowStateRef.current);
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

			dispatch({ type: MAIN_WINDOW_STATE_CHANGED,
				payload: {
					focused,
					visible,
					maximized,
					minimized,
					fullscreen,
					normal,
					bounds,
				} });
		};

		const fetchAndSaveWindowState = () => {
			clearTimeout(fetchAndSaveTimerRef.current);
			fetchAndSaveTimerRef.current = setTimeout(() => {
				fetchWindowState(browserWindow, windowStateRef.current);
				saveWindowState(windowStateRef.current);
			}, 1000);
		};

		browserWindow.addListener('resize', fetchAndSaveWindowState);
		browserWindow.addListener('move', fetchAndSaveWindowState);
		browserWindow.addListener('show', fetchAndSaveWindowState);

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
			browserWindow.removeListener('resize', fetchAndSaveWindowState);
			browserWindow.removeListener('move', fetchAndSaveWindowState);
			browserWindow.removeListener('show', fetchAndSaveWindowState);

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

			fetchWindowState(browserWindow, windowStateRef.current);

			browserWindow.blur();

			if (process.platform === 'darwin' || hideOnClose) {
				browserWindow.hide();
			} else if (process.platform === 'win32') {
				browserWindow.minimize();
			} else {
				remote.app.quit();
			}

			saveWindowState(windowStateRef.current);
		};
		browserWindow.addListener('close', handleClose);

		return () => {
			browserWindow.removeListener('close', handleClose);
		};
	}, [browserWindow, windowStateRef, hideOnClose]);
};

const useWindowStateLoading = (browserWindow, windowStateRef) => {
	useEffect(() => {
		const loadAndApplyWindowState = async () => {
			windowStateRef.current = await loadWindowState(browserWindow.getSize());
			applyWindowState(browserWindow, windowStateRef.current);
		};

		loadAndApplyWindowState();

		if (process.env.NODE_ENV === 'development') {
			browserWindow.webContents.openDevTools();
		}
	}, [browserWindow, windowStateRef]);
};

export function MainWindow({
	badge = undefined,
	browserWindow = remote.getCurrentWindow(),
	children,
	showWindowOnUnreadChanged = false,
}) {
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
	useWindowStateLoading(browserWindow, windowStateRef);

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
		yield take(SERVERS_READY);
		yield take(SPELL_CHECKING_READY);
		yield take(UPDATES_READY);
		setLoading(false);
	}, []);

	useSaga(function *() {
		yield takeEvery([
			MENU_BAR_ABOUT_CLICKED,
			MENU_BAR_ADD_NEW_SERVER_CLICKED,
			MENU_BAR_RELOAD_SERVER_CLICKED,
			MENU_BAR_GO_BACK_CLICKED,
			MENU_BAR_GO_FORWARD_CLICKED,
			MENU_BAR_SELECT_SERVER_CLICKED,
			TOUCH_BAR_SELECT_SERVER_TOUCHED,
			TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
			WEBVIEW_FOCUS_REQUESTED,
			DEEP_LINK_TRIGGERED,
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

		yield takeEvery(MENU_BAR_TOGGLE_SETTING_CLICKED, function *({ payload: setting }) {
			browserWindow.show();

			if (setting === 'showFullScreen') {
				browserWindow.setFullScreen(!browserWindow.isFullScreen());
			}
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
			if (!showWindowOnUnreadChanged || browserWindow.isFocused() || typeof badge !== 'number') {
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

		yield takeEvery(SPELL_CHECKING_ERROR_THROWN, function *({ payload: error }) {
			remote.dialog.showErrorBox(
				t('dialog.loadDictionaryError.title'),
				t('dialog.loadDictionaryError.message', { message: error.message }),
			);
		});
	}, [browserWindow, showWindowOnUnreadChanged]);

	return <>
		<GlobalStyles />
		<Wrapper>
			{process.platform === 'darwin' && <WindowDragBar />}
			{!loading && children}
		</Wrapper>
	</>;
}
