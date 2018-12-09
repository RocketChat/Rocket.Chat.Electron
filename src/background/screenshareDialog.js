import { app, BrowserWindow, ipcMain } from 'electron';
import { getMainWindow } from './mainWindow';
import i18n from '../i18n/index.js';


let screenshareWindow;

const openScreenshareDialog = async() => {
	if (screenshareWindow) {
		return;
	}

	const mainWindow = await getMainWindow();
	screenshareWindow = new BrowserWindow({
		title: i18n.__('About %s', app.getName()),
		parent: mainWindow,
		width: 776,
		height: 600,
		type: 'toolbar',
		resizable: false,
		fullscreenable: false,
		maximizable: false,
		minimizable: false,
		fullscreen: false,
		skipTaskbar: false,
		center: true,
		show: false,
	});
	screenshareWindow.setMenuBarVisibility(false);

	screenshareWindow.once('ready-to-show', () => {
		screenshareWindow.show();
	});

	screenshareWindow.once('closed', () => {
		if (!screenshareWindow.resultSent) {
			mainWindow.webContents.send('screenshare-result', 'PermissionDeniedError');
		}
		screenshareWindow = null;
	});

	screenshareWindow.loadFile(`${ __dirname }/public/screenshare-dialog.html`);
};

const closeScreenshareDialog = () => {
	screenshareWindow && screenshareWindow.destroy();
};

const selectScreenshareSource = async(id) => {
	const mainWindow = await getMainWindow();
	mainWindow.webContents.send('screenshare-result', id);
	if (screenshareWindow) {
		screenshareWindow.resultSent = true;
		screenshareWindow.destroy();
	}
};

ipcMain.on('open-screenshare-dialog', () => openScreenshareDialog());
ipcMain.on('close-screenshare-dialog', () => closeScreenshareDialog());
ipcMain.on('select-screenshare-source', (e, id) => selectScreenshareSource(id));
