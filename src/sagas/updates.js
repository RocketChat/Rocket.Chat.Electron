import fs from 'fs';
import path from 'path';

import { remote } from 'electron';
import { eventChannel } from 'redux-saga';
import { call, put, select, takeEvery } from 'redux-saga/effects';

import {
	ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED,
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
	UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
	MAIN_WINDOW_INSTALL_UPDATE_CLICKED,
	UPDATES_READY,
	UPDATES_CHECKING_FOR_UPDATE,
	UPDATES_ERROR_THROWN,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_UPDATE_DOWNLOADED,
} from '../actions';
import { readBoolean, readString, writeBoolean, writeString } from '../localStorage';

const { autoUpdater, CancellationToken } = remote.require('electron-updater');

const isUpdatingAllowed = (process.platform === 'linux' && !!process.env.APPIMAGE)
	|| (process.platform === 'win32' && !process.windowsStore)
	|| (process.platform === 'darwin' && !process.mas);

const loadConfiguration = async () => {
	let isEachUpdatesSettingConfigurable = true;
	let isUpdatingEnabled = true;
	let doCheckForUpdatesOnStartup = true;
	let skippedUpdateVersion = null;

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
				isEachUpdatesSettingConfigurable = !forced;
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
				return {
					isUpdatingAllowed,
					isEachUpdatesSettingConfigurable,
					isUpdatingEnabled,
					doCheckForUpdatesOnStartup,
					skippedUpdateVersion,
				};
			}
		}
	} catch (error) {
		isEachUpdatesSettingConfigurable = true;
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

	return {
		isUpdatingAllowed,
		isEachUpdatesSettingConfigurable,
		isUpdatingEnabled,
		doCheckForUpdatesOnStartup,
		skippedUpdateVersion,
	};
};

function *check() {
	const isUpdatingAllowed = yield select(({ isUpdatingAllowed }) => isUpdatingAllowed);
	const isUpdatingEnabled = yield select(({ isUpdatingEnabled }) => isUpdatingEnabled);

	if (!isUpdatingAllowed || !isUpdatingEnabled) {
		return;
	}

	try {
		yield call(::autoUpdater.checkForUpdates);
	} catch (error) {
		yield put({ type: UPDATES_ERROR_THROWN, payload: error });
	}
}

let cancellationToken;

function *download() {
	const isUpdatingAllowed = yield select(({ isUpdatingAllowed }) => isUpdatingAllowed);
	const isUpdatingEnabled = yield select(({ isUpdatingEnabled }) => isUpdatingEnabled);

	if (!isUpdatingAllowed || !isUpdatingEnabled) {
		return;
	}

	try {
		cancellationToken = new CancellationToken();
		yield call(::autoUpdater.downloadUpdate, cancellationToken);
	} catch (error) {
		yield put({ type: UPDATES_ERROR_THROWN, payload: error });
	}
}

function *install() {
	const isUpdatingAllowed = yield select(({ isUpdatingAllowed }) => isUpdatingAllowed);
	const isUpdatingEnabled = yield select(({ isUpdatingEnabled }) => isUpdatingEnabled);

	if (!isUpdatingAllowed || !isUpdatingEnabled) {
		return;
	}

	try {
		yield call(::autoUpdater.quitAndInstall);
	} catch (error) {
		yield put({ type: UPDATES_ERROR_THROWN, payload: error });
	}
}

function *takeActions() {
	yield takeEvery(ABOUT_DIALOG_TOGGLE_UPDATE_ON_START, function *() {
		const doCheckForUpdatesOnStartup = yield select(({ doCheckForUpdatesOnStartup }) => doCheckForUpdatesOnStartup);
		writeBoolean('doCheckForUpdatesOnStartup', doCheckForUpdatesOnStartup);
	});

	yield takeEvery(ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED, function *() {
		yield *check();
	});

	yield takeEvery(UPDATE_DIALOG_SKIP_UPDATE_CLICKED, function *() {
		const skippedUpdateVersion = yield select(({ skippedUpdateVersion }) => skippedUpdateVersion);
		writeString('skippedUpdateVersion', skippedUpdateVersion);
	});

	yield takeEvery(UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED, function *() {
		yield *download();
	});

	yield takeEvery(MAIN_WINDOW_INSTALL_UPDATE_CLICKED, function *() {
		yield *install();
	});
}

function *takeAutoUpdaterEvents() {
	autoUpdater.autoDownload = false;

	const createAutoUpdaterChannel = (autoUpdater, eventName) => eventChannel((emit) => {
		const listener = (...args) => emit(args);

		const cleanUp = () => {
			autoUpdater.removeListener(eventName, listener);
			window.removeEventListener('beforeunload', cleanUp);
		};

		autoUpdater.addListener(eventName, listener);
		window.addEventListener('beforeunload', cleanUp);

		return cleanUp;
	});

	const checkingForUpdateChannel = createAutoUpdaterChannel(autoUpdater, 'checking-for-update');
	const updateAvailableChannel = createAutoUpdaterChannel(autoUpdater, 'update-available');
	const updateNotAvailableChannel = createAutoUpdaterChannel(autoUpdater, 'update-not-available');
	const updateDownloadedChannel = createAutoUpdaterChannel(autoUpdater, 'update-downloaded');
	const errorChannel = createAutoUpdaterChannel(autoUpdater, 'error');

	yield takeEvery(checkingForUpdateChannel, function *() {
		yield put({ type: UPDATES_CHECKING_FOR_UPDATE });
	});

	yield takeEvery(updateAvailableChannel, function *([{ version }]) {
		const skippedUpdateVersion = yield select(({ skippedUpdateVersion }) => skippedUpdateVersion);
		if (skippedUpdateVersion === version) {
			yield put({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
			return;
		}

		yield put({ type: UPDATES_NEW_VERSION_AVAILABLE, payload: version });
	});

	yield takeEvery(updateNotAvailableChannel, function *() {
		yield put({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
	});

	yield takeEvery(updateDownloadedChannel, function *() {
		yield put({ type: UPDATES_UPDATE_DOWNLOADED });
	});

	yield takeEvery(errorChannel, function *([error]) {
		yield put({ type: UPDATES_ERROR_THROWN, payload: error });
	});
}

export function *updatesSaga() {
	yield *takeAutoUpdaterEvents();

	const {
		isUpdatingAllowed,
		isEachUpdatesSettingConfigurable,
		isUpdatingEnabled,
		doCheckForUpdatesOnStartup,
		skippedUpdateVersion,
	} = yield call(loadConfiguration);

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

	if (isUpdatingAllowed && isUpdatingEnabled && doCheckForUpdatesOnStartup) {
		yield *check();
	}

	yield *takeActions();
}
