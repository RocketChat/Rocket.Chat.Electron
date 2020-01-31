import { remote } from 'electron';
import jetpack from 'fs-jetpack';
import React, { useEffect, useRef } from 'react';

import {
	MAIN_WINDOW_STATE_CHANGED,
	MENU_BAR_ABOUT_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_COPY_CLICKED,
	MENU_BAR_CUT_CLICKED,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_PASTE_CLICKED,
	MENU_BAR_REDO_CLICKED,
	MENU_BAR_RELOAD_APP_CLICKED,
	MENU_BAR_RELOAD_SERVER_CLICKED,
	MENU_BAR_RESET_ZOOM_CLICKED,
	MENU_BAR_SELECT_ALL_CLICKED,
	MENU_BAR_SELECT_SERVER_CLICKED,
	MENU_BAR_TOGGLE_DEVTOOLS_CLICKED,
	MENU_BAR_TOGGLE_SETTING_CLICKED,
	MENU_BAR_UNDO_CLICKED,
	MENU_BAR_ZOOM_IN_CLICKED,
	MENU_BAR_ZOOM_OUT_CLICKED,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	TRAY_ICON_TOGGLE_CLICKED,
	WEBVIEW_UNREAD_CHANGED,
	WEBVIEW_FOCUS_REQUESTED,
	DEEP_LINK_TRIGGERED,
} from '../scripts/actions';

const isInsideSomeScreen = ({ x, y, width, height }) =>
	remote.screen.getAllDisplays()
		.some(({ bounds }) => x >= bounds.x && y >= bounds.y
		&& x + width <= bounds.x + bounds.width && y + height <= bounds.y + bounds.height,
		);

const loadWindowState = async ([width, height]) => {
	try {
		const userDataDir = jetpack.cwd(remote.app.getPath('userData'));
		const windowState = {
			width,
			height,
			...await userDataDir.readAsync('window-state-main.json', 'json') || {},
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
		const userDataDir = jetpack.cwd(remote.app.getPath('userData'));
		await userDataDir.writeAsync('window-state-main.json', windowState, { atomic: true });
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

		remote.app.on('activate', handleActivate);
		remote.app.on('before-quit', handleAppBeforeQuit);
		remote.app.on('second-instance', handleAppSecondInstance);

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

		browserWindow.on('resize', fetchAndSaveWindowState);
		browserWindow.on('move', fetchAndSaveWindowState);
		browserWindow.on('show', fetchAndSaveWindowState);

		browserWindow.on('show', fetchAndDispatchWindowState);
		browserWindow.on('hide', fetchAndDispatchWindowState);
		browserWindow.on('focus', fetchAndDispatchWindowState);
		browserWindow.on('blur', fetchAndDispatchWindowState);
		browserWindow.on('maximize', fetchAndDispatchWindowState);
		browserWindow.on('unmaximize', fetchAndDispatchWindowState);
		browserWindow.on('minimize', fetchAndDispatchWindowState);
		browserWindow.on('restore', fetchAndDispatchWindowState);
		browserWindow.on('resize', fetchAndDispatchWindowState);
		browserWindow.on('move', fetchAndDispatchWindowState);

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
	}, [browserWindow, windowStateRef, fetchAndSaveTimerRef]);
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
		browserWindow.on('close', handleClose);

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
	browserWindow = remote.getCurrentWindow(),
	children,
	hideOnClose = false,
	showWindowOnUnreadChanged = false,
	dispatch,
	subscribe,
}) {
	const windowStateRef = useRef({});

	useAppEvents(browserWindow, windowStateRef);
	useWindowStateUpdates(browserWindow, windowStateRef, dispatch);
	useWindowClosing(browserWindow, windowStateRef, hideOnClose);
	useWindowStateLoading(browserWindow, windowStateRef);

	useEffect(() => {
		const handleActionDispatched = ({ type, payload }) => {
			switch (type) {
				case MENU_BAR_ABOUT_CLICKED:
				case MENU_BAR_UNDO_CLICKED:
				case MENU_BAR_REDO_CLICKED:
				case MENU_BAR_CUT_CLICKED:
				case MENU_BAR_COPY_CLICKED:
				case MENU_BAR_PASTE_CLICKED:
				case MENU_BAR_SELECT_ALL_CLICKED:
				case MENU_BAR_ADD_NEW_SERVER_CLICKED:
				case MENU_BAR_RELOAD_SERVER_CLICKED:
				case MENU_BAR_GO_BACK_CLICKED:
				case MENU_BAR_GO_FORWARD_CLICKED:
				case MENU_BAR_RESET_ZOOM_CLICKED:
				case MENU_BAR_ZOOM_IN_CLICKED:
				case MENU_BAR_ZOOM_OUT_CLICKED:
				case MENU_BAR_SELECT_SERVER_CLICKED:
				case TOUCH_BAR_SELECT_SERVER_TOUCHED:
				case TOUCH_BAR_FORMAT_BUTTON_TOUCHED:
				case WEBVIEW_FOCUS_REQUESTED:
				case DEEP_LINK_TRIGGERED:
					browserWindow.show();
					break;

				case MENU_BAR_RELOAD_APP_CLICKED:
					browserWindow.show();
					browserWindow.reload();
					break;

				case MENU_BAR_TOGGLE_DEVTOOLS_CLICKED:
					browserWindow.show();
					browserWindow.toggleDevTools();
					break;

				case MENU_BAR_TOGGLE_SETTING_CLICKED: {
					browserWindow.show();

					const setting = payload;
					if (setting === 'showFullScreen') {
						browserWindow.setFullScreen(!browserWindow.isFullScreen());
					}
					break;
				}

				case TRAY_ICON_TOGGLE_CLICKED: {
					const visible = payload;
					if (visible) {
						browserWindow.show();
					} else {
						browserWindow.hide();
					}
					break;
				}

				case WEBVIEW_UNREAD_CHANGED: {
					const { badge } = payload;

					if (!showWindowOnUnreadChanged || browserWindow.isFocused() || typeof badge !== 'number') {
						break;
					}

					browserWindow.once('focus', () => {
						browserWindow.flashFrame(false);
					});
					browserWindow.showInactive();
					browserWindow.flashFrame(true);
				}
			}
		};

		return subscribe(handleActionDispatched);
	}, [browserWindow, showWindowOnUnreadChanged]);

	return <>
		{children}
	</>;
}
