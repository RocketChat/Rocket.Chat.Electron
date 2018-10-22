// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import url from 'url';
import path from 'path';

import windowStateKeeper from './windowState';
import env from '../env';

let mainWindow = null;
let hideOnClose = false;

const mainWindowOptions = {
	width: 1000,
	height: 600,
	minWidth: 600,
	minHeight: 400,
	titleBarStyle: 'hidden',
	show: false,
};

const attachWindowStateHandling = (mainWindow) => {
	const mainWindowState = windowStateKeeper('main', mainWindowOptions);

	mainWindow.once('ready-to-show', () => mainWindowState.loadState(mainWindow));

	// macOS only
	app.on('activate', () => {
		mainWindow.show();
	});

	app.on('before-quit', () => {
		mainWindowState.saveState.flush();
		mainWindow = null;
	});

	mainWindow.on('show', () => {
		mainWindowState.saveState(mainWindow);
	});

	mainWindow.on('close', function(event) {
		if (!mainWindow) {
			return;
		}

		event.preventDefault();
		if (mainWindow.isFullScreen()) {
			mainWindow.once('leave-full-screen', () => {
				(process.platform === 'darwin' || hideOnClose) ? mainWindow.hide() : mainWindow.minimize();
			});
			mainWindow.setFullScreen(false);
		} else {
			(process.platform === 'darwin' || hideOnClose) ? mainWindow.hide() : mainWindow.minimize();
		}
		mainWindowState.saveState(mainWindow);
	});

	mainWindow.on('resize', () => {
		mainWindowState.saveState(mainWindow);
	});

	mainWindow.on('move', () => {
		mainWindowState.saveState(mainWindow);
	});

	mainWindow.on('tray-created', () => {
		hideOnClose = true;
	});

	mainWindow.on('tray-destroyed', () => {
		hideOnClose = false;
	});
};

const attachIpcMessageHandling = (mainWindow) => {
	ipcMain.on('focus', () => {
		mainWindow.show();
	});

	ipcMain.on('update-taskbar-icon', (event, data, text) => {
		const img = nativeImage.createFromDataURL(data);
		mainWindow.setOverlayIcon(img, text);
	});
};

export const createMainWindow = (cb) => {
	if (mainWindow) {
		cb && cb(mainWindow);
		return;
	}

	mainWindow = new BrowserWindow(mainWindowOptions);
	attachWindowStateHandling(mainWindow);
	attachIpcMessageHandling(mainWindow);

	mainWindow.webContents.on('will-navigate', (event) => {
		event.preventDefault();
	});

	const appUrl = url.format({
		pathname: path.join(__dirname, 'public', 'app.html'),
		protocol: 'file:',
		slashes: true,
	});

	mainWindow.loadURL(appUrl);

	if (env.name === 'development') {
		mainWindow.openDevTools();
	}

	cb && cb(mainWindow);
};

export const getMainWindow = () => new Promise((resolve) => {
	if (app.isReady()) {
		createMainWindow(resolve);
		return;
	}

	app.on('ready', () => createMainWindow(resolve));
});

export const addServer = (serverUrl) => getMainWindow().then((mainWindow) => {
	mainWindow.send('add-host', serverUrl);

	mainWindow.show();

	if (mainWindow.isMinimized()) {
		mainWindow.restore();
	}
});
