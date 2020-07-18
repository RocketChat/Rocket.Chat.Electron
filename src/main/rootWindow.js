import path from 'path';

import { BrowserWindow, app } from 'electron';

import { setupMenuBar } from './menuBar';
import { setupI18next } from '../i18n';

const createRootWindow = () => {
	const rootWindow = new BrowserWindow({
		width: 1000,
		height: 600,
		minWidth: 400,
		minHeight: 400,
		titleBarStyle: 'hidden',
		backgroundColor: '#2f343d',
		show: false,
		webPreferences: {
			webviewTag: true,
			nodeIntegration: true,
		},
	});

	rootWindow.addListener('close', (event) => {
		event.preventDefault();
	});

	rootWindow.webContents.addListener('will-attach-webview', (event, webPreferences) => {
		delete webPreferences.enableBlinkFeatures;
	});

	rootWindow.loadFile(path.join(app.getAppPath(), 'app/public/app.html'));

	setupI18next().then(() => {
		setupMenuBar(rootWindow);
	});
};

export const setupRootWindow = () => {
	app.whenReady().then(() => createRootWindow());
};
