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


let configurable = true;
let updatesEnabled = true;
let checkForUpdatesOnStartup = true;
let skippedUpdateVersion = null;

const updatesAllowed = (process.platform === 'linux' && !!process.env.APPIMAGE)
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

const handleDownloadProgress = console.log;

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
	configurable = true;
	updatesEnabled = true;
	checkForUpdatesOnStartup = true;
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
				configurable = !forced;
			}

			if (canUpdate !== undefined) {
				updatesEnabled = Boolean(canUpdate);
			}

			if (autoUpdate !== undefined) {
				checkForUpdatesOnStartup = Boolean(autoUpdate);
			}

			if (skip !== undefined) {
				skippedUpdateVersion = Boolean(skip);
			}

			if (forced) {
				return;
			}
		}
	} catch (error) {
		configurable = true;
		updatesEnabled = true;
		checkForUpdatesOnStartup = true;
		skippedUpdateVersion = null;
	}

	updatesEnabled = readBoolean('updatesEnabled', updatesEnabled);
	checkForUpdatesOnStartup = readBoolean('checkForUpdatesOnStartup', checkForUpdatesOnStartup);
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
				checkForUpdatesOnStartup = Boolean(autoUpdate);
			}

			if (skip !== undefined) {
				skippedUpdateVersion = Boolean(skip);
			}
		}
	} catch (error) {
		console.error(error.stack);
	} finally {
		if (checkForUpdatesOnStartup === null) {
			checkForUpdatesOnStartup = true;
		}
	}
};

const check = async () => {
	if (!updatesAllowed || !updatesEnabled) {
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

	if (updatesAllowed && updatesEnabled && checkForUpdatesOnStartup) {
		await check();
	}
};

const tearDown = () => {
	autoUpdater.removeListener('checking-for-update', handleCheckingForUpdate);
	autoUpdater.removeListener('update-available', handleUpdateAvailable);
	autoUpdater.removeListener('update-not-available', handleUpdateNotAvailable);
	autoUpdater.removeListener('update-progress', handleDownloadProgress);
	autoUpdater.removeListener('update-downloaded', handleUpdateDownloaded);
	autoUpdater.removeListener('update-cancelled', handleUpdateCancelled);
	autoUpdater.removeListener('error', handleError);
	emitter.removeAllListeners();
};

const toggleCheckOnStartup = (_checkForUpdatesOnStartup = !checkForUpdatesOnStartup) => {
	if (!updatesAllowed || !updatesEnabled || !configurable) {
		return;
	}

	checkForUpdatesOnStartup = _checkForUpdatesOnStartup;
	writeBoolean('checkForUpdatesOnStartup', checkForUpdatesOnStartup);
};

const skipVersion = (version) => {
	if (!updatesAllowed || !updatesEnabled || !configurable) {
		return;
	}

	skippedUpdateVersion = version;
	writeString('skippedUpdateVersion', version);
};

let cancellationToken;

const download = async () => {
	if (!updatesAllowed || !updatesEnabled) {
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
	if (!updatesAllowed || !updatesEnabled || !cancellationToken) {
		return;
	}

	try {
		cancellationToken.cancel();
	} catch (error) {
		emitter.emit(ERROR_EVENT, error);
	}
};

const install = () => {
	if (!updatesAllowed || !updatesEnabled) {
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
	get enabled() {
		return updatesAllowed && updatesEnabled;
	},
	get configurable() {
		return configurable;
	},
	get checkOnStartup() {
		return updatesAllowed && updatesEnabled && checkForUpdatesOnStartup;
	},
	check,
	toggleCheckOnStartup,
	skipVersion,
	download,
	cancelDownload,
	install,
}));
