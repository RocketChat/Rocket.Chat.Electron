import { app, ipcMain } from 'electron';
import rimraf from 'rimraf';

import {
	QUERY_APP_VERSION,
	EVENT_ERROR_THROWN,
} from '../ipc';

export const relaunchApp = (...args) => {
	const command = process.argv.slice(1, app.isPackaged ? 1 : 2);
	app.relaunch({ args: [...command, ...args] });
	app.exit();
};

export const performStartup = () => {
	app.setAsDefaultProtocolClient('rocketchat');
	app.setAppUserModelId('chat.rocket');

	app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

	const args = process.argv.slice(app.isPackaged ? 1 : 2);

	if (args.includes('--reset-app-data')) {
		rimraf.sync(app.getPath('userData'));
		relaunchApp();
		return;
	}

	const canStart = process.mas || app.requestSingleInstanceLock();

	if (!canStart) {
		app.exit();
		return;
	}

	if (args.includes('--disable-gpu')) {
		app.disableHardwareAcceleration();
		app.commandLine.appendSwitch('--disable-2d-canvas-image-chromium');
		app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
		app.commandLine.appendSwitch('--disable-gpu');
	}
};

export const getPlatform = () => process.platform;

export const setupApp = (reduxStore, rootWindow) => {
	app.addListener('activate', () => {
		rootWindow.showInactive();
		rootWindow.focus();
	});

	app.addListener('before-quit', () => {
		if (rootWindow.isDestroyed()) {
			return;
		}

		rootWindow.destroy();
	});

	app.addListener('second-instance', () => {
		rootWindow.showInactive();
		rootWindow.focus();
	});

	app.addListener('window-all-closed', () => {
		app.quit();
	});

	ipcMain.handle(QUERY_APP_VERSION, () => app.getVersion());

	ipcMain.addListener(EVENT_ERROR_THROWN, (event, error) => {
		console.error(error);
	});
};
