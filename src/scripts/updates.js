import { remote } from 'electron';
import jetpack from 'fs-jetpack';
import { t } from 'i18next';

import {
	ABOUT_DIALOG_DISMISSED,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	UPDATES_CHECK_FAILED,
} from './actions';
import { dispatch } from './effects';
import { handle, removeHandler } from './ipc';

const { app, dialog } = remote;
const { autoUpdater } = remote.require('electron-updater');

const updateSettingsFileName = 'update.json';
let appDir;
let userDataDir;
let appUpdateSettings = {};
let userUpdateSettings = {};
let updateSettings = {};

const loadUpdateSettings = (dir) => {
	try {
		return dir.read(updateSettingsFileName, 'json') || {};
	} catch (error) {
		console.error(error);
		return {};
	}
};

const saveUpdateSettings = () => {
	if (appUpdateSettings.forced) {
		return;
	}

	userDataDir.write(updateSettingsFileName, userUpdateSettings, { atomic: true });
};

const canUpdate = () => updateSettings.canUpdate
	&& (
		(process.platform === 'linux' && Boolean(process.env.APPIMAGE))
		|| (process.platform === 'win32' && !process.windowsStore)
		|| (process.platform === 'darwin' && !process.mas)
	);

const canSetAutoUpdate = () => !appUpdateSettings.forced || appUpdateSettings.autoUpdate !== false;

const canAutoUpdate = () => updateSettings.autoUpdate !== false;

const setAutoUpdate = (canAutoUpdate) => {
	if (!canSetAutoUpdate()) {
		return;
	}

	userUpdateSettings.autoUpdate = !!canAutoUpdate;
	updateSettings.autoUpdate = !!canAutoUpdate;
	saveUpdateSettings();
};

const skipUpdateVersion = (version) => {
	userUpdateSettings.skip = version;
	saveUpdateSettings();
};

const downloadUpdate = async () => {
	try {
		await autoUpdater.downloadUpdate();
	} catch (e) {
		autoUpdater.emit('error', e);
	}
};

export const checkForUpdates = async (_, { forced = false } = {}) => {
	if ((forced || canAutoUpdate()) && canUpdate()) {
		try {
			await autoUpdater.checkForUpdates();
		} catch (e) {
			autoUpdater.emit('error', e);
		}
	}
};

const handleCheckingForUpdate = () => {};

const handleUpdateAvailable = ({ version }) => {
	if (updateSettings.skip === version) {
		dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
		return;
	}

	dispatch({ type: ABOUT_DIALOG_DISMISSED });
	dispatch({ type: UPDATES_NEW_VERSION_AVAILABLE, payload: version });
};

const handleUpdateNotAvailable = () => {
	dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
};

const handleUpdateDownloaded = async () => {
	const mainWindow = remote.getCurrentWindow();

	const { response } = await dialog.showMessageBox(mainWindow, {
		type: 'question',
		title: t('dialog.updateReady.title'),
		message: t('dialog.updateReady.message'),
		buttons: [
			t('dialog.updateReady.installLater'),
			t('dialog.updateReady.installNow'),
		],
		defaultId: 1,
	});

	if (response === 0) {
		await dialog.showMessageBox(mainWindow, {
			type: 'info',
			title: t('dialog.updateInstallLater.title'),
			message: t('dialog.updateInstallLater.message'),
			buttons: [t('dialog.updateInstallLater.ok')],
			defaultId: 0,
		});
		return;
	}

	mainWindow.removeAllListeners();
	app.removeAllListeners('window-all-closed');
	try {
		autoUpdater.quitAndInstall();
	} catch (e) {
		autoUpdater.emit('error', e);
	}
};

const handleError = () => {
	dispatch({ type: UPDATES_CHECK_FAILED });
};

export const setupUpdates = () => {
	appDir = jetpack.cwd(app.getAppPath(), app.getAppPath().endsWith('app.asar') ? '..' : '.');
	userDataDir = jetpack.cwd(app.getPath('userData'));
	appUpdateSettings = loadUpdateSettings(appDir);
	userUpdateSettings = loadUpdateSettings(userDataDir);
	updateSettings = (() => {
		const defaultUpdateSettings = { autoUpdate: true, canUpdate: true };

		if (appUpdateSettings.forced) {
			return Object.assign({}, defaultUpdateSettings, appUpdateSettings);
		}
		return Object.assign({}, defaultUpdateSettings, appUpdateSettings, userUpdateSettings);
	})();
	delete updateSettings.forced;

	autoUpdater.autoDownload = false;
	autoUpdater.on('checking-for-update', handleCheckingForUpdate);
	autoUpdater.on('update-available', handleUpdateAvailable);
	autoUpdater.on('update-not-available', handleUpdateNotAvailable);
	autoUpdater.on('update-downloaded', handleUpdateDownloaded);
	autoUpdater.on('error', handleError);

	window.addEventListener('unload', () => {
		autoUpdater.off('checking-for-update', handleCheckingForUpdate);
		autoUpdater.off('update-available', handleUpdateAvailable);
		autoUpdater.off('update-not-available', handleUpdateNotAvailable);
		autoUpdater.off('update-downloaded', handleUpdateDownloaded);
		autoUpdater.off('error', handleError);
	});

	handle('updates/set-auto-update', (_, ...args) => setAutoUpdate(...args));
	handle('updates/check-for-updates', (_, ...args) => checkForUpdates(...args));
	handle('updates/skip-update-version', (_, ...args) => skipUpdateVersion(...args));
	handle('updates/download-update', (_, ...args) => downloadUpdate(...args));
	handle('updates/can-update', (_, ...args) => canUpdate(...args));
	handle('updates/can-auto-update', (_, ...args) => canAutoUpdate(...args));
	handle('updates/can-set-auto-update', (_, ...args) => canSetAutoUpdate(...args));

	window.addEventListener('unload', () => {
		removeHandler('updates/set-auto-update');
		removeHandler('updates/check-for-updates');
		removeHandler('updates/skip-update-version');
		removeHandler('updates/download-update');
		removeHandler('updates/can-update');
		removeHandler('updates/can-auto-update');
		removeHandler('updates/can-set-auto-update');
	});

	checkForUpdates();

	return {
		canUpdate: canUpdate(),
		canSetAutoUpdate: canSetAutoUpdate(),
		canAutoUpdate: canAutoUpdate(),
	};
};
