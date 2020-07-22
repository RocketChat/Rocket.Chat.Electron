import path from 'path';

import { app, BrowserWindow } from 'electron';

export const createRootWindow = async () => {
	await app.whenReady();

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

	return new Promise((resolve) => {
		rootWindow.on('ready-to-show', () => {
			resolve(rootWindow);
		});
	});
};
