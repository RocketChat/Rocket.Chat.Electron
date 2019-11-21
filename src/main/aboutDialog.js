import { app, BrowserWindow, ipcMain } from 'electron';

import { getMainWindow } from './mainWindow';

let browserWindow;

async function open() {
	if (browserWindow) {
		return;
	}

	const mainWindow = await getMainWindow();
	browserWindow = new BrowserWindow({
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
			devTools: true,
			nodeIntegration: true,
		},
	});
	browserWindow.setMenuBarVisibility(false);

	browserWindow.once('ready-to-show', () => {
		browserWindow.show();
	});

	browserWindow.once('closed', () => {
		browserWindow = null;
	});

	browserWindow.loadFile(`${ app.getAppPath() }/app/public/aboutDialog.html`);
}

function close() {
	if (browserWindow) {
		browserWindow.destroy();
	}
}

ipcMain.on('open-about-dialog', (e, ...args) => open(...args));
ipcMain.on('close-about-dialog', (e, ...args) => close(...args));
