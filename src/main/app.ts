import { app, ipcMain, BrowserWindow } from 'electron';
import { Store } from 'redux';

import { EVENT_ERROR_THROWN } from '../ipc';

export const relaunchApp = (...args: string[]): void => {
	const command = process.argv.slice(1, app.isPackaged ? 1 : 2);
	app.relaunch({ args: [...command, ...args] });
	app.exit();
};

export const setupApp = (_reduxStore: Store, rootWindow: BrowserWindow): void => {
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

	ipcMain.addListener(EVENT_ERROR_THROWN, (_event, error) => {
		console.error(error);
	});
};
