import { remote } from 'electron';
import { call, select } from 'redux-saga/effects';

import { readFromStorage } from '../localStorage';
import { readConfigurationFile } from '../sagaUtils';

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

function *applyMainWindowState(browserWindow, mainWindowState) {
	let { x, y } = mainWindowState.bounds;
	const { width, height } = mainWindowState.bounds;
	if (!isInsideSomeScreen({ x, y, width, height })) {
		const {
			bounds: {
				width: primaryDisplayWidth,
				height: primaryDisplayHeight,
			},
		} = remote.screen.getPrimaryDisplay();
		x = (primaryDisplayWidth - width) / 2;
		y = (primaryDisplayHeight - height) / 2;
	}

	if (browserWindow.isVisible()) {
		return;
	}

	browserWindow.setBounds({ x, y, width, height });

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
}

export function *mainWindowStateSaga() {
	const browserWindow = remote.getCurrentWindow();
	const mainWindowState = yield *loadMainWindowState();
	yield *applyMainWindowState(browserWindow, mainWindowState);
}
