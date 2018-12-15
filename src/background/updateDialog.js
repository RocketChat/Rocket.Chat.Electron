import { app, BrowserWindow, ipcMain } from 'electron';
import { getMainWindow } from './mainWindow';
import i18n from '../i18n/index.js';


let updateWindow;

const openUpdateDialog = async({ currentVersion = app.getVersion(), newVersion } = {}) => {
	if (updateWindow) {
		return;
	}

	const mainWindow = await getMainWindow();
	updateWindow = new BrowserWindow({
		title: i18n.__('Update_Available'),
		parent: mainWindow,
		modal: process.platform !== 'darwin',
		width: 600,
		height: 330,
		type: 'toolbar',
		resizable: false,
		fullscreenable: false,
		maximizable: false,
		minimizable: false,
		fullscreen: false,
		show: false,
	});
	updateWindow.setMenuBarVisibility(false);

	updateWindow.once('ready-to-show', () => {
		updateWindow.show();
	});

	updateWindow.once('closed', () => {
		updateWindow = null;
	});

	updateWindow.params = { currentVersion, newVersion };

	updateWindow.loadFile(`${ __dirname }/public/update-dialog.html`);
};

const closeUpdateDialog = () => {
	updateWindow.destroy();
};

ipcMain.on('open-update-dialog', (e, ...args) => openUpdateDialog(...args));
ipcMain.on('close-update-dialog', () => closeUpdateDialog());
