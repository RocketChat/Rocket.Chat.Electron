import path from 'path';

import { app, BrowserWindow, ipcMain } from 'electron';
import setupElectronReload from 'electron-reload';
import rimraf from 'rimraf';

import { readFromStorage } from './localStorage';
import { setupErrorHandling } from './errorHandling';


const Store = require('electron-store');

const store = new Store();

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
		minWidth: 500,
		minHeight: 500,
		titleBarStyle: 'hidden',
		backgroundColor: '#2f343d',
		show: false,
		webPreferences: {
			webviewTag: true,
			nodeIntegration: true,
		},
	});

	mainWindow.addListener('close', async (e) => {
		preventEvent(e);
		console.log('closing');
	});

	mainWindow.webContents.addListener('will-attach-webview', (event, webPreferences) => {
		delete webPreferences.enableBlinkFeatures;
	});

	mainWindow.loadFile(`${ app.getAppPath() }/app/public/app.html`);

	console.log(store.get('downloads', {}));

	// Load All Downloads from LocalStorage in Main Process
	ipcMain.on('load-downloads', async () => {
		console.log('Loading Downloads');
		const downloads = await store.get('downloads', {});
		mainWindow.webContents.send('initialize-downloads', downloads);
	});
	// store.clear();


	ipcMain.on('download-complete', async (event, downloadItem) => {
		const downloads = await store.get('downloads', {});
		downloads[downloadItem.fileName] = downloadItem;
		console.log(downloads);
		store.set('downloads', downloads);
		// console.log(downloadItem);
	});
	// Downloads handler. Handles all downloads from links.
	mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
		// console.log({ event, item, webContents });

		// Set the save path, making Electron not to prompt a save dialog.
		mainWindow.webContents.send('download-start', { totalBytes: item.getTotalBytes(), filename: item.getFilename(), url: item.getURL(), id: webContents.id });
		item.on('updated', (event, state) => {
			if (state === 'interrupted') {
				console.log('Download is interrupted but can be resumed');
			} else if (state === 'progressing') {
				if (item.isPaused()) {
					console.log('Download is paused');
				} else {
					mainWindow.webContents.send('downloading', item.getReceivedBytes());
					console.log(`Received bytes: ${ item.getReceivedBytes() }`);
				}
			}
		});
		item.once('done', (event, state) => {
			if (state === 'completed') {
				mainWindow.webContents.send('download-complete');
				console.log('Download successfully');
			} else {
				console.log(`Download failed: ${ state }`);
			}
		});
	});
};

const initialize = async () => {
	prepareApp();
	await app.whenReady();
	createMainWindow();
};

initialize();
