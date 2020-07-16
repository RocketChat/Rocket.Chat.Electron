import { app, BrowserWindow } from 'electron';

import { setupDevelopmentTools } from './main/dev';
import { setupErrorHandling } from './main/errors';
import { handleStartup } from './main/startup';
import { setupAppEvents } from './main/events';

if (require.main === module) {
	setupDevelopmentTools();
	setupErrorHandling();
	handleStartup();
	setupAppEvents();
}

const createMainWindow = () => {
	const mainWindow = new BrowserWindow({
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

	mainWindow.addListener('close', (event) => {
		event.preventDefault();
	});

	mainWindow.webContents.addListener('will-attach-webview', (event, webPreferences) => {
		delete webPreferences.enableBlinkFeatures;
	});

	mainWindow.loadFile(`${ app.getAppPath() }/app/public/app.html`);
};

const initialize = async () => {
	await app.whenReady();
	createMainWindow();
};

initialize();
