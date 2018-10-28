import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import windowStateKeeper from './windowState';
import { whenReady, whenReadyToShow } from './utils';
import env from '../env';
import icon from './icon';

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

export const getMainWindow = async() => {
	await whenReady();

	if (!mainWindow) {
		mainWindow = new BrowserWindow(mainWindowOptions);

		attachWindowStateHandling(mainWindow);
		attachIpcMessageHandling(mainWindow);

		mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

		mainWindow.loadURL(`file://${ __dirname }/public/app.html`);

		if (process.platform !== 'darwin') {
			mainWindow.setIcon(await icon.render({ size: 64 }));
		}

		if (env.name === 'development') {
			mainWindow.openDevTools();
		}

		whenReadyToShow(mainWindow);
	}

	return mainWindow;
};

export const addServer = (serverUrl) => getMainWindow().then((mainWindow) => {
	mainWindow.send('add-host', serverUrl);

	mainWindow.show();

	if (mainWindow.isMinimized()) {
		mainWindow.restore();
	}
});
