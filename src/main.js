import path from 'path';

import { app, BrowserWindow } from 'electron';
import setupElectronReload from 'electron-reload';
import jetpack from 'fs-jetpack';

import { setupErrorHandling } from './errorHandling';

if (process.env.NODE_ENV === 'development') {
	setupElectronReload(__dirname, {
		electron: process.execPath,
	});
}

const preventEvent = (event) => event.preventDefault();

const prepareApp = () => {
	setupErrorHandling('main');

	app.setAsDefaultProtocolClient('rocketchat');
	app.setAppUserModelId('chat.rocket');

	const dirName = process.env.NODE_ENV === 'production' ? app.name : `${ app.name } (${ process.env.NODE_ENV })`;

	app.setPath('userData', path.join(app.getPath('appData'), dirName));

	if (process.argv[2] === '--reset-app-data') {
		const dataDir = app.getPath('userData');
		jetpack.remove(dataDir);
		app.relaunch({ args: [process.argv[1]] });
		app.exit();
		return;
	}

	const canStart = process.mas || app.requestSingleInstanceLock();

	if (!canStart) {
		app.exit();
		return;
	}

	app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

	// TODO: make it a setting
	if (process.platform === 'linux') {
		app.disableHardwareAcceleration();
	}

	app.on('certificate-error', preventEvent);
	app.on('login', preventEvent);
	app.on('open-url', preventEvent);
	app.on('window-all-closed', () => {
		app.quit();
	});
};

const createMainWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 1000,
		height: 600,
		minWidth: 600,
		minHeight: 400,
		titleBarStyle: 'hidden',
		show: false,
		webPreferences: {
			webviewTag: true,
			nodeIntegration: true,
		},
	});

	mainWindow.on('close', preventEvent);

	mainWindow.webContents.on('will-attach-webview', (event, webPreferences) => {
		delete webPreferences.enableBlinkFeatures;
	});

	mainWindow.loadFile(`${ app.getAppPath() }/app/public/app.html`);
};

const initialize = async () => {
	prepareApp();
	await app.whenReady();
	createMainWindow();
};

initialize();
