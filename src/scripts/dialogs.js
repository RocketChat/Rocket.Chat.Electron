import querystring from 'querystring';

import { remote } from 'electron';

const { app, BrowserWindow } = remote;

const dialogs = {};

const createDialog = ({ name, parent, width, height, params = {} }) => {
	if (dialogs[name]) {
		return;
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
};

const destroyDialog = (name) => {
	if (!dialogs[name]) {
		return;
	}

	dialogs[name].destroy();
};

export const openAboutDialog = () => {
	createDialog({
		name: 'aboutDialog',
		parent: remote.getCurrentWindow(),
		width: 400,
		height: 300,
	});
};

export const closeAboutDialog = () => {
	destroyDialog('aboutDialog');
};

export const openScreenSharingDialog = () => {
	createDialog({
		name: 'screenSharingDialog',
		parent: remote.getCurrentWindow(),
		width: 776,
		height: 600,
	});
};

export const closeScreenSharingDialog = () => {
	destroyDialog('screenSharingDialog');
};

export const selectScreenSharingSource = (id) => {
	remote.getCurrentWebContents().send('screenshare-result', id || 'PermissionDeniedError');
};

export const openUpdateDialog = ({ newVersion } = {}) => {
	createDialog({
		name: 'updateDialog',
		parent: remote.getCurrentWindow(),
		width: 600,
		height: 330,
		params: { newVersion },
	});
};

export const closeUpdateDialog = () => {
	destroyDialog('updateDialog');
};
