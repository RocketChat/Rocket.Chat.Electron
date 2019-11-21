import { app, BrowserWindow, ipcMain } from 'electron';

import { getMainWindow } from './mainWindow';

let window;

async function open() {
	if (window) {
		return;
	}

	const mainWindow = await getMainWindow();
	window = new BrowserWindow({
		width: 400,
		height: 300,
		useContentSize: true,
		center: true,
		resizable: false,
		minimizable: false,
		maximizable: false,
		fullscreen: false,
		fullscreenable: false,
		skipTaskbar: true,
		show: false,
		parent: mainWindow,
		modal: process.platform !== 'darwin',
		backgroundColor: '#F4F4F4',
		type: process.platform === 'darwin' ? 'desktop' : 'toolbar',
		webPreferences: {
			devTools: false,
			nodeIntegration: true,
		},
	});
	window.setMenuBarVisibility(false);

	window.once('ready-to-show', () => {
		window.show();
	});

	window.once('closed', () => {
		window = null;
	});

	window.loadFile(`${ app.getAppPath() }/app/public/aboutDialog.html`);
}

function close() {
	if (window) {
		window.destroy();
	}
}

ipcMain.on('open-about-dialog', (e, ...args) => open(...args));
ipcMain.on('close-about-dialog', (e, ...args) => close(...args));
