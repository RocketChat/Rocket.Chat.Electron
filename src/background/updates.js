import { app, dialog, ipcMain } from 'electron';
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

const canUpdate = () => updateSettings.canUpdate &&
	(
		(process.platform === 'linux' && Boolean(process.env.APPIMAGE)) ||
		(process.platform === 'win32' && !process.windowsStore) ||
		(process.platform === 'darwin' && !process.mas)
	);

const canAutoUpdate = () => updateSettings.autoUpdate !== false;

const canSetAutoUpdate = () => !appUpdateSettings.forced || appUpdateSettings.autoUpdate !== false;

const setAutoUpdate = (canAutoUpdate) => {
	if (!canSetAutoUpdate()) {
		return;
	}

	updateSettings.autoUpdate = userUpdateSettings.autoUpdate = Boolean(canAutoUpdate);
	saveUpdateSettings();
};

const skipUpdateVersion = (version) => {
	userUpdateSettings.skip = version;
	saveUpdateSettings();
};

const downloadUpdate = () => {
	autoUpdater.downloadUpdate();
};

let checkForUpdatesEvent = null;

const checkForUpdates = (e = null, { forced = false } = {}) => {
	if (checkForUpdatesEvent) {
		return;
	}

	if ((forced || canAutoUpdate()) && canUpdate()) {
		checkForUpdatesEvent = e;
		autoUpdater.checkForUpdates();
	}
};

const sendToMainWindow = async(channel, ...args) => {
	const mainWindow = await getMainWindow();
	const send = () => mainWindow.send(channel, ...args);

	if (mainWindow.webContents.isLoading()) {
		mainWindow.webContents.on('dom-ready', send);
		return;
	}

	send();
};

const handleCheckingForUpdate = () => {
	sendToMainWindow('update-checking');
};

const handleUpdateAvailable = ({ version }) => {
	if (checkForUpdatesEvent) {
		checkForUpdatesEvent.sender.send('update-result', true);
		checkForUpdatesEvent = null;
	} else if (updateSettings.skip === version) {
		return;
	}

	ipcMain.emit('close-about-dialog');
	ipcMain.emit('open-update-dialog', undefined, { newVersion: version });
};

const handleUpdateNotAvailable = () => {
	sendToMainWindow('update-not-available');

	if (checkForUpdatesEvent) {
		checkForUpdatesEvent.sender.send('update-result', false);
		checkForUpdatesEvent = null;
	}
};

const handleUpdateDownloaded = async() => {
	const mainWindow = await getMainWindow();

	const response = dialog.showMessageBox(mainWindow, {
		type: 'question',
		title: i18n.__('Update_ready'),
		message: i18n.__('Update_ready_message'),
		buttons: [
			i18n.__('Update_Install_Later'),
			i18n.__('Update_Install_Now'),
		],
		defaultId: 1,
	});

	if (response === 0) {
		dialog.showMessageBox(mainWindow, {
			type: 'info',
			title: i18n.__('Update_installing_later'),
			message: i18n.__('Update_installing_later_message'),
			buttons: [i18n.__('OK')],
			defaultId: 0,
		});
		return;
	}

	mainWindow.removeAllListeners();
	app.removeAllListeners('window-all-closed');
	autoUpdater.quitAndInstall();
};

const handleError = async(error) => {
	sendToMainWindow('update-error', error);

	if (checkForUpdatesEvent) {
		checkForUpdatesEvent.sender.send('update-result', false);
		checkForUpdatesEvent = null;
	}
};

autoUpdater.autoDownload = false;
autoUpdater.on('checking-for-update', handleCheckingForUpdate);
autoUpdater.on('update-available', handleUpdateAvailable);
autoUpdater.on('update-not-available', handleUpdateNotAvailable);
autoUpdater.on('update-downloaded', handleUpdateDownloaded);
autoUpdater.on('error', handleError);

ipcMain.on('can-update', (e) => { e.returnValue = canUpdate(); });
ipcMain.on('can-auto-update', (e) => { e.returnValue = canAutoUpdate(); });
ipcMain.on('can-set-auto-update', (e) => { e.returnValue = canSetAutoUpdate(); });
ipcMain.on('set-auto-update', (e, canAutoUpdate) => setAutoUpdate(canAutoUpdate));
ipcMain.on('check-for-updates', (e, ...args) => checkForUpdates(e, ...args));
ipcMain.on('skip-update-version', (e, ...args) => skipUpdateVersion(...args));
ipcMain.on('remind-update-later', () => {});
ipcMain.on('download-update', () => downloadUpdate());
