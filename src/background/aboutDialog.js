import { app, BrowserWindow, ipcMain } from 'electron';
import { getMainWindow } from './mainWindow';
import i18n from '../i18n/index.js';


let aboutWindow;

const openAboutDialog = async() => {
	const mainWindow = await getMainWindow();
	aboutWindow = new BrowserWindow({
		title: i18n.__('About %s', app.getName()),
		parent: mainWindow,
		modal: true,
		width: 400,
		height: 300,
		type: 'toolbar',
		resizable: false,
		maximizable: false,
		minimizable: false,
		show: false,
	});
	aboutWindow.setMenuBarVisibility(false);

	aboutWindow.once('ready-to-show', () => {
		aboutWindow.show();
	});

	aboutWindow.once('closed', () => {
		aboutWindow = null;
	});

	aboutWindow.loadFile(`${ __dirname }/public/aboutDialog.html`);
};

const closeAboutDialog = () => {
	aboutWindow && aboutWindow.destroy();
};

ipcMain.on('open-about-dialog', openAboutDialog);
ipcMain.on('close-about-dialog', closeAboutDialog);
