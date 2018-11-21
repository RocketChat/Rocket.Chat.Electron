import { app, dialog, ipcMain, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import jetpack from 'fs-jetpack';
import { getMainWindow } from './mainWindow';
import i18n from '../i18n/index.js';


const appDir = jetpack.cwd(app.getAppPath(), app.getAppPath().endsWith('app.asar') ? '..' : '.');
const userDataDir = jetpack.cwd(app.getPath('userData'));
const updateSettingsFileName = 'update.json';

const loadUpdateSettings = (dir) => {
	try {
		return dir.read(updateSettingsFileName, 'json') || {};
	} catch (error) {
		console.error(error);
		return {};
	}
};

const appUpdateSettings = loadUpdateSettings(appDir);
const userUpdateSettings = loadUpdateSettings(userDataDir);
const updateSettings = (() => {
	const defaultUpdateSettings = { autoUpdate: true, canUpdate: true };

	if (appUpdateSettings.forced) {
		return Object.assign({}, defaultUpdateSettings, appUpdateSettings);
	} else {
		return Object.assign({}, defaultUpdateSettings, appUpdateSettings, userUpdateSettings);
	}
})();
delete updateSettings.forced;

const saveUpdateSettings = () => {
	if (appUpdateSettings.forced) {
		return;
	}

	userDataDir.write(updateSettingsFileName, userUpdateSettings, { atomic: true });
};

export const canUpdate = () => updateSettings.canUpdate &&
	(
		(process.platform === 'linux' && Boolean(process.env.APPIMAGE)) ||
		(process.platform === 'win32' && !process.windowsStore) ||
		(process.platform === 'darwin' && !process.mas)
	);

export const canAutoUpdate = () => updateSettings.autoUpdate !== false;

export const canSetAutoUpdate = () => !appUpdateSettings.forced || appUpdateSettings.autoUpdate !== false;

export const setAutoUpdate = (canAutoUpdate) => {
	if (!canSetAutoUpdate()) {
		return;
	}

	updateSettings.autoUpdate = userUpdateSettings.autoUpdate = Boolean(canAutoUpdate);
	saveUpdateSettings();
};

ipcMain.on('can-update', (event) => {
	event.returnValue = canUpdate();
});

ipcMain.on('can-auto-update', (event) => {
	event.returnValue = canAutoUpdate();
});

ipcMain.on('can-set-auto-update', (event) => {
	event.returnValue = canSetAutoUpdate();
});

ipcMain.on('set-auto-update', (event, canAutoUpdate) => {
	setAutoUpdate(canAutoUpdate);
});

let checkForUpdatesEvent;

async function updateDownloaded() {
	const response = dialog.showMessageBox({
		title: i18n.__('Update_ready'),
		message: i18n.__('Update_ready_message'),
		buttons: [
			i18n.__('Update_Install_Later'),
			i18n.__('Update_Install_Now'),
		],
		defaultId: 1,
	});

	if (response === 0) {
		dialog.showMessageBox({
			title: i18n.__('Update_installing_later'),
			message: i18n.__('Update_installing_later_message'),
		});
		return;
	}

	const mainWindow = await getMainWindow();
	mainWindow.removeAllListeners();
	app.removeAllListeners('window-all-closed');
	autoUpdater.quitAndInstall();
}

function updateAvailable({ version }) {
	if (checkForUpdatesEvent) {
		checkForUpdatesEvent.sender.send('update-result', true);
		checkForUpdatesEvent = null;
	} else if (updateSettings.skip === version) {
		return;
	}

	let window = new BrowserWindow({
		title: i18n.__('Update_Available'),
		width: 600,
		height: 330,
		show : false,
		center: true,
		resizable: false,
		maximizable: false,
		minimizable: false,
	});

	window.loadURL(`file://${ __dirname }/public/update.html`);
	window.setMenuBarVisibility(false);

	window.webContents.on('did-finish-load', () => {
		window.webContents.send('new-version', version);
		window.show();
	});

	ipcMain.once('update-response', (e, type) => {
		switch (type) {
			case 'skip':
				userUpdateSettings.skip = version;
				saveUpdateSettings();
				dialog.showMessageBox({
					title: i18n.__('Update_skip'),
					message: i18n.__('Update_skip_message'),
				}, () => window.close());
				break;
			case 'remind':
				dialog.showMessageBox({
					title: i18n.__('Update_remind'),
					message: i18n.__('Update_remind_message'),
				}, () => window.close());
				break;
			case 'update':
				dialog.showMessageBox({
					title: i18n.__('Update_downloading'),
					message: i18n.__('Update_downloading_message'),
				}, () => window.close());
				autoUpdater.downloadUpdate();
				break;
		}
	});

	window.on('closed', () => {
		window = null;
		ipcMain.removeAllListeners('update-response');
	});
}

autoUpdater.autoDownload = false;

const sendToRenderer = async(channel, ...args) => {
	const mainWindow = await getMainWindow();
	const send = () => mainWindow.send(channel, ...args);

	if (mainWindow.webContents.isLoading()) {
		mainWindow.webContents.on('dom-ready', send);
		return;
	}

	send();
};

autoUpdater.on('error', async(error) => {
	sendToRenderer('update-error', error);

	if (checkForUpdatesEvent) {
		checkForUpdatesEvent.sender.send('update-result', false);
		checkForUpdatesEvent = null;
	}
});

autoUpdater.on('checking-for-update', async() => {
	sendToRenderer('update-checking');
});

autoUpdater.on('update-available', updateAvailable);

autoUpdater.on('update-not-available', () => {
	sendToRenderer('update-not-available');

	if (checkForUpdatesEvent) {
		checkForUpdatesEvent.sender.send('update-result', false);
		checkForUpdatesEvent = null;
	}
});

autoUpdater.on('update-downloaded', updateDownloaded);

ipcMain.on('check-for-updates', (event) => {
	if (canAutoUpdate() && canUpdate()) {
		checkForUpdatesEvent = event;
		autoUpdater.checkForUpdates();
	}
});

export default () => {
	if (canAutoUpdate() && canUpdate()) {
		autoUpdater.checkForUpdates();
	}
};
