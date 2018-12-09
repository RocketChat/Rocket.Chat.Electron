import { app, BrowserWindow, ipcMain } from 'electron';
import { getMainWindow } from './mainWindow';
import i18n from '../i18n/index.js';


let updateWindow;

const openUpdateDialog = async({ currentVersion = app.getVersion(), newVersion }) => {
	const mainWindow = await getMainWindow();
	updateWindow = new BrowserWindow({
		title: i18n.__('Update_Available'),
		parent: mainWindow,
		modal: true,
		width: 600,
		height: 330,
		type: 'toolbar',
		resizable: false,
		maximizable: false,
		minimizable: false,
		show: false,
	});
	updateWindow.setMenuBarVisibility(false);

	updateWindow.once('ready-to-show', () => {
		updateWindow.show();
	});

	updateWindow.once('closed', () => {
		updateWindow = null;
	});

	updateWindow.variables = { currentVersion, newVersion };

	updateWindow.loadFile(`${ __dirname }/public/updateDialog.html`);
};

const closeUpdateDialog = () => {
	updateWindow.destroy();
};

ipcMain.on('open-update-dialog', openUpdateDialog);
ipcMain.on('close-update-dialog', closeUpdateDialog);
