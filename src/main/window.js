import path from 'path';

import { BrowserWindow, app } from 'electron';

const createWindow = () => {
	const window = new BrowserWindow({
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

	window.addListener('close', (event) => {
		event.preventDefault();
	});

	window.webContents.addListener('will-attach-webview', (event, webPreferences) => {
		delete webPreferences.enableBlinkFeatures;
	});

	window.loadFile(path.join(app.getAppPath(), 'app/public/app.html'));
};

export const setupWindow = () => {
	app.whenReady().then(() => createWindow());
};
