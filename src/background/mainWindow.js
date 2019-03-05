import { app, BrowserWindow, ipcMain } from 'electron';
import createWindowStateKeeper from './windowState';


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
	webPreferences: {
		nodeIntegration: true,
	},
};

const setState = (partialState) => {
	state = {
		...state,
		...partialState,
	};
};

const whenReadyToShow =
	(window) => new Promise((resolve) => window.on('ready-to-show', resolve));

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
		mainWindow.blur();

		if (process.platform === 'darwin' || state.hideOnClose) {
			mainWindow.hide();
		} else if (process.platform === 'win32') {
			mainWindow.minimize();
		} else {
			app.quit();
		}
	};

	app.on('activate', () => mainWindow && mainWindow.show());
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
	await app.whenReady();

	if (!mainWindow) {
		mainWindow = new BrowserWindow(mainWindowOptions);
		mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
		mainWindow.loadURL(`file://${ __dirname }/public/app.html`);
		attachWindowStateHandling(mainWindow);

		if (process.env.NODE_ENV === 'development') {
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

ipcMain.on('focus', async() => {
	const mainWindow = await getMainWindow();

	if (process.platform === 'win32') {
		if (mainWindow.isVisible()) {
			mainWindow.focus();
		} else if (mainWindow.isMinimized()) {
			mainWindow.restore();
		} else {
			mainWindow.show();
		}

		return;
	}

	if (mainWindow.isMinimized()) {
		mainWindow.restore();
		return;
	}

	mainWindow.show();
	mainWindow.focus();
});
