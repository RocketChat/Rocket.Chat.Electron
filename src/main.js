import path from 'path';

import { app, BrowserWindow } from 'electron';
import setupElectronReload from 'electron-reload';
import rimraf from 'rimraf';

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

	const [command, args] = [
		process.argv.slice(0, app.isPackaged ? 1 : 2),
		process.argv.slice(app.isPackaged ? 1 : 2),
	];

	if (args.includes('--disable-gpu')) {
		app.commandLine.appendSwitch('--disable-2d-canvas-image-chromium');
		app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
		app.commandLine.appendSwitch('--disable-gpu');
	}

	if (args.includes('--reset-app-data')) {
		const dataDir = app.getPath('userData');
		rimraf.sync(dataDir);
		app.relaunch({ args: [...command.slice(1)] });
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

	app.addListener('certificate-error', preventEvent);
	app.addListener('select-client-certificate', preventEvent);
	app.addListener('login', preventEvent);
	app.addListener('open-url', preventEvent);
	app.addListener('window-all-closed', () => {
		app.quit();
	});
};

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

	mainWindow.addListener('close', preventEvent);

	mainWindow.webContents.addListener('will-attach-webview', (event, webPreferences) => {
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
