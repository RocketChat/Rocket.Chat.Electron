import { app, BrowserWindow, ipcMain } from 'electron';
import createWindowStateKeeper from './windowState';
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
	const windowStateKeeper = createWindowStateKeeper('main', mainWindowOptions);
	whenReadyToShow(mainWindow).then(() => windowStateKeeper.loadState(mainWindow));

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
		windowStateKeeper.saveState.flush();
		mainWindow = null;
	});

	mainWindow.on('resize', () => windowStateKeeper.saveState(mainWindow));
	mainWindow.on('move', () => windowStateKeeper.saveState(mainWindow));
	mainWindow.on('show', () => windowStateKeeper.saveState(mainWindow));
	mainWindow.on('close', async(event) => {
		if (!mainWindow) {
			return;
		}

		event.preventDefault();
		await exitFullscreen();
		close();
		windowStateKeeper.saveState(mainWindow);
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
			mainWindow.setIcon(await icon.render({
				size: {
					win32: [256, 128, 64, 48, 32, 24, 16],
					linux: 128,
				}[process.platform],
			}));
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
