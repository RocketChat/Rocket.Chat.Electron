import fs from 'fs';
import path from 'path';

import { app } from 'electron';
import { autoUpdater, CancellationToken } from 'electron-updater';
import { select, call, put, takeEvery, spawn } from 'redux-saga/effects';

import {
	UPDATES_ERROR_THROWN,
	UPDATES_CHECKING_FOR_UPDATE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_UPDATE_DOWNLOADED,
	ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
	ROOT_WINDOW_INSTALL_UPDATE_CLICKED,
	UPDATES_READY,
} from '../actions';
import { eventEmitterChannel } from './channels';
import {
	selectSkippedUpdateVersion,
	selectUpdateConfiguration,
} from './selectors';
import { getPlatform } from './app';

const loadAppConfiguration = async () => {
	try {
		const filePath = path.join(
			app.getAppPath(),
			app.getAppPath().endsWith('app.asar') ? '..' : '.',
			'update.json',
		);
		const content = await fs.promises.readFile(filePath, 'utf8');
		const json = JSON.parse(content);

		return json && typeof json === 'object' ? json : {};
	} catch (error) {
		return {};
	}
};

const loadUserConfiguration = async () => {
	try {
		const filePath = path.join(app.getPath('userData'), 'update.json');
		const content = await fs.promises.readFile(filePath, 'utf8');
		const json = JSON.parse(content);
		await fs.promises.unlink(filePath);

		return json && typeof json === 'object' ? json : {};
	} catch (error) {
		return {};
	}
};

function *loadConfiguration() {
	const defaultConfiguration = yield select(selectUpdateConfiguration);
	const appConfiguration = yield call(loadAppConfiguration);

	const configuration = {
		...defaultConfiguration,
		...appConfiguration.forced ? { isEachUpdatesSettingConfigurable: false } : {},
		...appConfiguration.canUpdate ? { doCheckForUpdatesOnStartup: true } : {},
		...appConfiguration.autoUpdate ? { doCheckForUpdatesOnStartup: true } : {},
		...appConfiguration.skip ? { skippedUpdateVersion: String(appConfiguration.skip) } : {},
	};

	if (configuration.isEachUpdatesSettingConfigurable) {
		const userConfiguration = yield call(loadUserConfiguration);

		if (userConfiguration.autoUpdate) {
			configuration.doCheckForUpdatesOnStartup = true;
		}

		if (userConfiguration.skip) {
			configuration.skippedUpdateVersion = String(userConfiguration.skip);
		}
	}

	return configuration;
}

const checkForUpdates = () => {
	autoUpdater.checkForUpdates();
};

let cancellationToken;

const downloadUpdate = () => {
	cancellationToken = new CancellationToken();
	autoUpdater.downloadUpdate(cancellationToken);
};

const installUpdate = () => {
	app.removeAllListeners('window-all-closed');
	autoUpdater.quitAndInstall(true, true);
};

function *watchEvents() {
	yield takeEvery(eventEmitterChannel(autoUpdater, 'checking-for-update'), function *() {
		yield put({ type: UPDATES_CHECKING_FOR_UPDATE });
	});

	yield takeEvery(eventEmitterChannel(autoUpdater, 'update-available'), function *([{ version }]) {
		const skippedUpdateVersion = yield select(selectSkippedUpdateVersion);
		if (skippedUpdateVersion === version) {
			yield put({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
			return;
		}

		yield put({ type: UPDATES_NEW_VERSION_AVAILABLE, payload: version });
	});

	yield takeEvery(eventEmitterChannel(autoUpdater, 'update-not-available'), function *() {
		yield put({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
	});

	yield takeEvery(eventEmitterChannel(autoUpdater, 'update-downloaded'), function *() {
		yield put({ type: UPDATES_UPDATE_DOWNLOADED });
	});

	yield takeEvery(eventEmitterChannel(autoUpdater, 'error'), function *([error]) {
		yield put({ type: UPDATES_ERROR_THROWN, payload: error });
	});

	yield takeEvery(ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED, function *() {
		try {
			yield call(checkForUpdates);
		} catch (error) {
			yield put({ type: UPDATES_ERROR_THROWN, payload: error });
		}
	});

	yield takeEvery(UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED, function *() {
		try {
			yield call(downloadUpdate);
		} catch (error) {
			yield put({ type: UPDATES_ERROR_THROWN, payload: error });
		}
	});

	yield takeEvery(ROOT_WINDOW_INSTALL_UPDATE_CLICKED, function *() {
		try {
			yield call(installUpdate);
		} catch (error) {
			yield put({ type: UPDATES_ERROR_THROWN, payload: error });
		}
	});
}

export function *setupUpdates() {
	autoUpdater.autoDownload = false;

	const platform = yield call(getPlatform);

	const isUpdatingAllowed = (platform === 'linux' && !!process.env.APPIMAGE)
		|| (platform === 'win32' && !process.windowsStore)
		|| (platform === 'darwin' && !process.mas);

	const {
		isEachUpdatesSettingConfigurable,
		isUpdatingEnabled,
		doCheckForUpdatesOnStartup,
		skippedUpdateVersion,
	} = yield *loadConfiguration();

	yield put({
		type: UPDATES_READY,
		payload: {
			isUpdatingAllowed,
			isEachUpdatesSettingConfigurable,
			isUpdatingEnabled,
			doCheckForUpdatesOnStartup,
			skippedUpdateVersion,
		},
	});

	if (!isUpdatingAllowed || !isUpdatingEnabled) {
		return;
	}

	if (doCheckForUpdatesOnStartup) {
		yield spawn(function *() {
			try {
				yield call(checkForUpdates);
			} catch (error) {
				yield put({ type: UPDATES_ERROR_THROWN, payload: error });
			}
		});
	}

	yield *watchEvents();
}
