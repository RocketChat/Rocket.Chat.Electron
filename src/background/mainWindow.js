import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import windowStateKeeper from './windowState';
import { whenReady, whenReadyToShow } from './utils';
import env from '../env';
import icon from './icon';


let mainWindow = null;

let state = {
	hideOnClose: false,
};

const mainWindowOptions = {
	width: 1000,
	height: 600,
	minWidth: 600,
	minHeight: 400,
	titleBarStyle: 'hidden',
	show: false,
};

const setState = (partialState) => {
	state = {
		...state,
		...partialState,
	};
};

const attachWindowStateHandling = (mainWindow) => {
	const mainWindowState = windowStateKeeper('main', mainWindowOptions);
	whenReadyToShow(mainWindow).then(() => mainWindowState.loadState(mainWindow));

	const exitFullscreen = () => new Promise((resolve) => {
		if (mainWindow.isFullScreen()) {
			mainWindow.once('leave-full-screen', resolve);
			mainWindow.setFullScreen(false);
			return;
		}
		resolve();
	});

	const close = () => {
		if (process.platform === 'darwin' || state.hideOnClose) {
			mainWindow.hide();
		} else {
			mainWindow.minimize();
		}
	};

	app.on('activate', () => mainWindow.show());
	app.on('before-quit', () => {
		mainWindowState.saveState.flush();
		mainWindow = null;
	});

	mainWindow.on('resize', () => mainWindowState.saveState(mainWindow));
	mainWindow.on('move', () => mainWindowState.saveState(mainWindow));
	mainWindow.on('show', () => mainWindowState.saveState(mainWindow));
	mainWindow.on('close', async(event) => {
		if (!mainWindow) {
			return;
		}

		event.preventDefault();
		await exitFullscreen();
		close();
		mainWindowState.saveState(mainWindow);
	});

	mainWindow.on('set-state', setState);
};

export const getMainWindow = async() => {
	await whenReady();

	if (!mainWindow) {
		mainWindow = new BrowserWindow(mainWindowOptions);
		mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
		mainWindow.loadURL(`file://${ __dirname }/public/app.html`);
		attachWindowStateHandling(mainWindow);

		if (process.platform !== 'darwin') {
			mainWindow.setIcon(await icon.render({ size: [16, 32, 48, 64, 128] }));
		}

		if (env.name === 'development') {
			mainWindow.openDevTools();
		}
	}

	return mainWindow;
};

export const addServer = (serverUrl) => getMainWindow().then((mainWindow) => {
	mainWindow.show();

	if (mainWindow.isMinimized()) {
		mainWindow.restore();
	}

	mainWindow.send('add-host', serverUrl);
});

ipcMain.on('focus', async() => (await getMainWindow()).show());

ipcMain.on('update-taskbar-icon', async(event, dataUrl, text) => {
	const image = nativeImage.createFromDataURL(dataUrl);
	(await getMainWindow()).setOverlayIcon(image, text);
});
