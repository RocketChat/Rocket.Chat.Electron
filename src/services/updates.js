import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

import { remote } from 'electron';

import { readBoolean, readString, writeBoolean, writeString } from '../localStorage';

const { autoUpdater, CancellationToken } = remote.require('electron-updater');

const emitter = new EventEmitter();

const CHECKING_EVENT = 'checking';
const SKIPPED_EVENT = 'skipped';
const NOT_AVAILABLE_EVENT = 'not-available';
const AVAILABLE_EVENT = 'available';
const DOWNLOADED_EVENT = 'downloaded';
const CANCELLED_EVENT = 'cancelled';
const ERROR_EVENT = 'error';

let isEachUpdatesSettingsConfigurable = true;
let isUpdatingEnabled = true;
let doCheckForUpdatesOnStartup = true;
let skippedUpdateVersion = null;

const isUpdatingAllowed = (process.platform === 'linux' && !!process.env.APPIMAGE)
	|| (process.platform === 'win32' && !process.windowsStore)
	|| (process.platform === 'darwin' && !process.mas);

const handleCheckingForUpdate = () => {
	emitter.emit(CHECKING_EVENT);
};

const handleUpdateAvailable = ({ version }) => {
	if (skippedUpdateVersion === version) {
		emitter.emit(SKIPPED_EVENT, version);
		return;
	}

	emitter.emit(AVAILABLE_EVENT, version);
};

const handleUpdateNotAvailable = () => {
	emitter.emit(NOT_AVAILABLE_EVENT);
};

const handleDownloadProgress = () => {};

const handleUpdateDownloaded = async () => {
	emitter.emit(DOWNLOADED_EVENT);
};

const handleUpdateCancelled = () => {
	emitter.emit(CANCELLED_EVENT);
};

const handleError = (error) => {
	emitter.emit(ERROR_EVENT, error);
};

const loadConfiguration = async () => {
	isEachUpdatesSettingsConfigurable = true;
	isUpdatingEnabled = true;
	doCheckForUpdatesOnStartup = true;
	skippedUpdateVersion = null;

	const appConfigurationFilePath = path.join(
		remote.app.getAppPath(),
		remote.app.getAppPath().endsWith('app.asar') ? '..' : '.',
		'update.json',
	);

	try {
		if (await fs.promises.stat(appConfigurationFilePath).then((stat) => stat.isFile(), () => false)) {
			const {
				forced,
				autoUpdate,
				canUpdate,
				skip,
			} = JSON.parse(await fs.promises.readFile(appConfigurationFilePath, 'utf8'));

			if (forced !== undefined) {
				isEachUpdatesSettingsConfigurable = !forced;
			}

			if (canUpdate !== undefined) {
				isUpdatingEnabled = Boolean(canUpdate);
			}

			if (autoUpdate !== undefined) {
				doCheckForUpdatesOnStartup = Boolean(autoUpdate);
			}

			if (skip !== undefined) {
				skippedUpdateVersion = Boolean(skip);
			}

			if (forced) {
				return;
			}
		}
	} catch (error) {
		isEachUpdatesSettingsConfigurable = true;
		isUpdatingEnabled = true;
		doCheckForUpdatesOnStartup = true;
		skippedUpdateVersion = null;
	}

	isUpdatingEnabled = readBoolean('isUpdatingEnabled', isUpdatingEnabled);
	doCheckForUpdatesOnStartup = readBoolean('doCheckForUpdatesOnStartup', doCheckForUpdatesOnStartup);
	skippedUpdateVersion = readString('skippedUpdateVersion', skippedUpdateVersion);

	try {
		const userConfigurationFilePath = path.join(remote.app.getPath('userData'), 'update.json');

		if (await fs.promises.stat(userConfigurationFilePath).then((stat) => stat.isFile(), () => false)) {
			const {
				autoUpdate,
				skip,
			} = JSON.parse(await fs.promises.readFile(userConfigurationFilePath, 'utf8'));
			await fs.promises.unlink(userConfigurationFilePath);

			if (autoUpdate !== undefined) {
				doCheckForUpdatesOnStartup = Boolean(autoUpdate);
			}

			if (skip !== undefined) {
				skippedUpdateVersion = Boolean(skip);
			}
		}
	} catch (error) {
		console.error(error.stack);
	} finally {
		if (doCheckForUpdatesOnStartup === null) {
			doCheckForUpdatesOnStartup = true;
		}
	}
};

const check = async () => {
	if (!isUpdatingAllowed || !isUpdatingEnabled) {
		return;
	}

	try {
		await autoUpdater.checkForUpdates();
	} catch (error) {
		emitter.emit(ERROR_EVENT, error);
	}
};

const setUp = async () => {
	autoUpdater.autoDownload = false;
	autoUpdater.addListener('checking-for-update', handleCheckingForUpdate);
	autoUpdater.addListener('update-available', handleUpdateAvailable);
	autoUpdater.addListener('update-not-available', handleUpdateNotAvailable);
	autoUpdater.addListener('download-progress', handleDownloadProgress);
	autoUpdater.addListener('update-downloaded', handleUpdateDownloaded);
	autoUpdater.addListener('update-cancelled', handleUpdateCancelled);
	autoUpdater.addListener('error', handleError);

	await loadConfiguration();

	if (isUpdatingAllowed && isUpdatingEnabled && doCheckForUpdatesOnStartup) {
		await check();
	}
};

const tearDown = () => {
	autoUpdater.removeListener('checking-for-update', handleCheckingForUpdate);
	autoUpdater.removeListener('update-available', handleUpdateAvailable);
	autoUpdater.removeListener('update-not-available', handleUpdateNotAvailable);
	autoUpdater.removeListener('download-progress', handleDownloadProgress);
	autoUpdater.removeListener('update-downloaded', handleUpdateDownloaded);
	autoUpdater.removeListener('update-cancelled', handleUpdateCancelled);
	autoUpdater.removeListener('error', handleError);
	emitter.removeAllListeners();
};

const toggleCheckOnStartup = (_checkForUpdatesOnStartup = !doCheckForUpdatesOnStartup) => {
	if (!isUpdatingAllowed || !isUpdatingEnabled || !isEachUpdatesSettingsConfigurable) {
		return;
	}

	doCheckForUpdatesOnStartup = _checkForUpdatesOnStartup;
	writeBoolean('doCheckForUpdatesOnStartup', doCheckForUpdatesOnStartup);
};

const skipVersion = (version) => {
	if (!isUpdatingAllowed || !isUpdatingEnabled || !isEachUpdatesSettingsConfigurable) {
		return;
	}

	skippedUpdateVersion = version;
	writeString('skippedUpdateVersion', skippedUpdateVersion);
};

let cancellationToken;

const download = async () => {
	if (!isUpdatingAllowed || !isUpdatingEnabled) {
		return;
	}

	try {
		cancellationToken = new CancellationToken();
		await autoUpdater.downloadUpdate(cancellationToken);
	} catch (error) {
		emitter.emit(ERROR_EVENT, error);
	}
};

const cancelDownload = () => {
	if (!isUpdatingAllowed || !isUpdatingEnabled || !cancellationToken) {
		return;
	}

	try {
		cancellationToken.cancel();
	} catch (error) {
		emitter.emit(ERROR_EVENT, error);
	}
};

const install = () => {
	if (!isUpdatingAllowed || !isUpdatingEnabled) {
		return;
	}

	try {
		autoUpdater.quitAndInstall();
	} catch (error) {
		emitter.emit(ERROR_EVENT, error);
	}
};

export default Object.seal(Object.assign(emitter, {
	constants: Object.freeze({
		CHECKING_EVENT,
		SKIPPED_EVENT,
		NOT_AVAILABLE_EVENT,
		AVAILABLE_EVENT,
		DOWNLOADED_EVENT,
		CANCELLED_EVENT,
		ERROR_EVENT,
	}),
	setUp,
	tearDown,
	isUpdatingAllowed: () => isUpdatingAllowed,
	isEachUpdatesSettingConfigurable: () => isEachUpdatesSettingsConfigurable,
	isUpdatingEnabled: () => isUpdatingEnabled,
	doCheckForUpdatesOnStartup: () => doCheckForUpdatesOnStartup,
	check,
	toggleCheckOnStartup,
	skipVersion,
	download,
	cancelDownload,
	install,
}));
