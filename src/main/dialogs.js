import querystring from 'querystring';

import { app, BrowserWindow, ipcMain } from 'electron';

import { getMainWindow } from './mainWindow';

const dialogs = {};

const createDialog = ({ name, parent, width, height, params }) => {
	if (dialogs[name]) {
		return dialogs[name];
	}

	const dialog = new BrowserWindow({
		width,
		height,
		useContentSize: true,
		center: true,
		resizable: false,
		minimizable: false,
		maximizable: false,
		fullscreen: false,
		fullscreenable: false,
		skipTaskbar: true,
		show: false,
		parent,
		modal: process.platform !== 'darwin',
		backgroundColor: '#F4F4F4',
		type: process.platform === 'darwin' ? 'desktop' : 'toolbar',
		webPreferences: {
			devTools: false,
			nodeIntegration: true,
		},
	});
	dialog.setMenuBarVisibility(false);

	dialog.once('ready-to-show', () => {
		dialog.show();
	});

	dialog.once('closed', () => {
		delete dialogs[name];
	});

	dialog.loadURL(`file:///${ app.getAppPath() }/app/public/${ name }.html?${ querystring.stringify(params) }`);

	dialogs[name] = dialog;

	return dialog;
};

const destroyDialog = (name) => {
	if (!dialogs[name]) {
		return;
	}

	dialogs[name].destroy();
};

export const openAboutDialog = async () => {
	createDialog({
		name: 'aboutDialog',
		parent: await getMainWindow(),
		width: 400,
		height: 300,
	});
};

export const closeAboutDialog = () => {
	destroyDialog('aboutDialog');
};

export const openScreenSharingDialog = async () => {
	createDialog({
		name: 'screenSharingDialog',
		parent: await getMainWindow(),
		width: 776,
		height: 600,
	});
};

export const closeScreenSharingDialog = () => {
	destroyDialog('screenSharingDialog');
};

export const selectScreenSharingSource = async (id) => {
	const mainWindow = await getMainWindow();
	mainWindow.webContents.send('screenshare-result', id || 'PermissionDeniedError');
};

export const openUpdateDialog = async ({ newVersion } = {}) => {
	createDialog({
		name: 'updateDialog',
		parent: await getMainWindow(),
		width: 600,
		height: 330,
		params: { newVersion },
	});
};

const closeUpdateDialog = () => {
	destroyDialog('updateDialog');
};

const handleOpenAboutDialog = (_, ...args) => openAboutDialog(...args);
const handleCloseAboutDialog = (_, ...args) => closeAboutDialog(...args);
const handleOpenScreenSharingDialog = (_, ...args) => openScreenSharingDialog(...args);
const handleCloseScreenSharingDialog = (_, ...args) => closeScreenSharingDialog(...args);
const handleSelectScreenSharingSource = (_, ...args) => selectScreenSharingSource(...args);
const handleOpenUpdateDialog = (_, ...args) => openUpdateDialog(...args);
const handleCloseUpdateDialog = (_, ...args) => closeUpdateDialog(...args);

ipcMain.on('open-about-dialog', handleOpenAboutDialog);
ipcMain.on('close-about-dialog', handleCloseAboutDialog);
ipcMain.on('open-screenshare-dialog', handleOpenScreenSharingDialog);
ipcMain.on('close-screenshare-dialog', handleCloseScreenSharingDialog);
ipcMain.on('select-screenshare-source', handleSelectScreenSharingSource);
ipcMain.on('open-update-dialog', handleOpenUpdateDialog);
ipcMain.on('close-update-dialog', handleCloseUpdateDialog);
