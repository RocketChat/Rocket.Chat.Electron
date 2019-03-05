import { app, BrowserWindow, ipcMain } from 'electron';
import { WindowStateHandler } from './state';


let mainWindow = null;

let state = {
	hideOnClose: false,
};

const setState = (partialState) => {
	state = {
		...state,
		...partialState,
	};
};

async function attachWindowStateHandling(mainWindow) {
	const windowStateHandler = new WindowStateHandler(mainWindow, 'main');
	await windowStateHandler.load();
	await new Promise((resolve) => mainWindow.once('ready-to-show', resolve));
	windowStateHandler.apply();

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
		mainWindow = null;
		windowStateHandler.save();
	});

	mainWindow.on('resize', () => windowStateHandler.fetchAndSave());
	mainWindow.on('move', () => windowStateHandler.fetchAndSave());
	mainWindow.on('show', () => windowStateHandler.fetchAndSave());
	mainWindow.on('close', async(event) => {
		if (!mainWindow) {
			return;
		}

		event.preventDefault();
		await exitFullscreen();
		close();
		windowStateHandler.fetchAndSave();
	});

	mainWindow.on('set-state', setState);
}

async function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 600,
		minWidth: 600,
		minHeight: 400,
		titleBarStyle: 'hidden',
		show: false,
		webPreferences: {
			nodeIntegration: true,
		},
	});
	attachWindowStateHandling(mainWindow);
	mainWindow.loadFile(`${ app.getAppPath() }/app/public/app.html`);

	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}
}

export const getMainWindow = async() => {
	await app.whenReady();

	if (!mainWindow) {
		await createMainWindow();
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
