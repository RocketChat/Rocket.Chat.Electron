import path from 'path';

import sharp from 'sharp';
import { app, BrowserWindow, ipcMain } from 'electron';
import setupElectronReload from 'electron-reload';
import rimraf from 'rimraf';

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


	// Logs and Helpers
	console.log(store.get('downloads', {}));
	// store.clear();

	// Load all downloads from LocalStorage into Main Process and send to Download Manager.
	ipcMain.on('load-downloads', async () => {
		const downloads = await store.get('downloads', {});
		mainWindow.webContents.send('initialize-downloads', downloads);
	});

	ipcMain.on('reset', async () => {
		await store.clear();
		const downloads = await store.get('downloads', {});
		mainWindow.webContents.send('initialize-downloads', downloads);
	});

	ipcMain.on('remove', async (event, itemdId) => {
		await store.delete(`downloads.${ itemdId }`);
	});

	// Listen and save a single download being completed.
	ipcMain.on('download-complete', async (event, downloadItem) => {
		const downloads = await store.get('downloads', {});
		downloads[downloadItem.itemId] = downloadItem;
		store.set('downloads', downloads);
	});

	// Downloads handler. Handles all downloads from links.
	mainWindow.webContents.session.on('will-download', async (event, item, webContents) => {
		const mime = item.getMimeType();
		const itemId = Date.now();
		const url = item.getURLChain()[0];
		const serverTitle = url.split('#')[1];
		const startTime = new Date().getTime();
		const totalBytes = item.getTotalBytes();
		let paused = false;
		let endTime;

		mainWindow.webContents.send('create-download-item', { status: 'All Downloads', serverTitle, itemId, totalBytes: item.getTotalBytes(), fileName: item.getFilename(), url, serverId: webContents.id, mime }); // Request download item creation in UI and send unqiue ID.

		// Cancelled Download
		ipcMain.on(`cancel-${ itemId }`, () => item.cancel());

		// Paused Download
		ipcMain.on(`pause-${ itemId }`, () => {
			if (paused) {
				item.resume();
			} else {
				item.pause();
			}
			paused = !paused;
		});
		item.on('updated', (event, state) => {
			if (state === 'interrupted') {
				console.log('Download is interrupted but can be resumed');
			} else if (state === 'progressing') {
				if (item.isPaused()) {
					console.log('Download is paused');
				} else {
					endTime = new Date().getTime();
					const duration = (endTime - startTime) / 1000;
					const Bps = (item.getReceivedBytes() / duration).toFixed(2);
					const Kbps = (Bps / 1024).toFixed(2);
					const Mbps = (Kbps / 1024).toFixed(2);
					const recievedBytes = item.getReceivedBytes();
					const timeLeft = Bps ? Math.round((totalBytes - recievedBytes) / Bps) : null;
					const path = item.getSavePath();
					const pathsArray = path.split('/');
					const fileName = pathsArray[pathsArray.length - 1];

					// Sending Download Information. TODO: Seperate bytes as information sent is being repeated.
					mainWindow.webContents.send(`downloading-${ itemId }`, { bytes: item.getReceivedBytes(), Mbps, Kbps, timeLeft, fileName });
				}
			}
		});
		item.once('done', async (event, state) => {
			if (state === 'completed') {
				const path = item.getSavePath();
				const pathsArray = path.split('/');
				const fileName = pathsArray[pathsArray.length - 1];
				const thumbnail = mime.split('/')[0] === 'image' ? await sharp(path).resize(100, 100).png().toBuffer() : null;
				mainWindow.webContents.send(`download-complete-${ itemId }`, { percentage: 100, path, fileName, thumbnail: thumbnail && `data:image/png;base64,${ thumbnail.toString('base64') }` }); // Send to specific DownloadItem
			} else {
				mainWindow.webContents.send('download-cancelled', itemId); // Remove Item from UI if interrupted or cancelled
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
