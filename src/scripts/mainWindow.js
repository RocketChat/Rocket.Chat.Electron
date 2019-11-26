import { remote } from 'electron';
import jetpack from 'fs-jetpack';

import { createElement, useEffect, useRef } from './reactiveUi';

const { app, screen } = remote;

const isInsideSomeScreen = ({ x, y, width, height }) =>
	screen.getAllDisplays()
		.some(({ bounds }) => x >= bounds.x && y >= bounds.y
		&& x + width <= bounds.x + bounds.width && y + height <= bounds.y + bounds.height,
		);

const loadWindowState = async ([width, height]) => {
	try {
		const userDataDir = jetpack.cwd(app.getPath('userData'));
		const windowState = {
			width,
			height,
			...await userDataDir.readAsync('window-state-main.json', 'json') || {},
		};

		if (!isInsideSomeScreen(windowState)) {
			const { bounds } = screen.getPrimaryDisplay();
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
		const userDataDir = jetpack.cwd(app.getPath('userData'));
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

const useBeforeAppQuitEvent = (browserWindow, windowStateRef) => {
	useEffect(() => {
		const handleBeforeAppQuit = () => {
			remote.app.removeListener('before-quit', handleBeforeAppQuit);
			saveWindowState(windowStateRef.current);
			browserWindow.destroy();
		};

		remote.app.on('before-quit', handleBeforeAppQuit);

		return () => {
			remote.app.removeListener('before-quit', handleBeforeAppQuit);
		};
	}, [browserWindow, windowStateRef]);
};

const useWindowStateUpdates = (browserWindow, windowStateRef) => {
	const fetchAndSaveTimerRef = useRef();

	useEffect(() => {
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

		return () => {
			browserWindow.removeListener('resize', fetchAndSaveWindowState);
			browserWindow.removeListener('move', fetchAndSaveWindowState);
			browserWindow.removeListener('show', fetchAndSaveWindowState);
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
				app.quit();
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

const useIpcRequests = (browserWindow) => {
	useEffect(() => {
		const handleFocusRequest = () => {
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

		remote.ipcMain.on('main-window/focus', handleFocusRequest);

		return () => {
			remote.ipcMain.removeListener('main-window/focus', handleFocusRequest);
		};
	}, [browserWindow]);
};

export function MainWindow({ browserWindow, hideOnClose = false }) {
	const windowStateRef = useRef({});

	useBeforeAppQuitEvent(browserWindow, windowStateRef);
	useWindowStateUpdates(browserWindow, windowStateRef);
	useWindowClosing(browserWindow, windowStateRef, hideOnClose);
	useWindowStateLoading(browserWindow, windowStateRef);
	useIpcRequests(browserWindow);

	return null;
}

let mainWindowElement;

export async function mountMainWindow() {
	mainWindowElement = createElement(MainWindow, { browserWindow: remote.getCurrentWindow() });
	mainWindowElement.mount(document.body);
}

export const unmountMainWindow = () => {
	mainWindowElement.unmount();
	mainWindowElement = undefined;
};

export const updateMainWindow = (newProps) => {
	mainWindowElement.update(newProps);
};
