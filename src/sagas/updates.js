import { remote } from 'electron';
import { call, put, select, takeEvery } from 'redux-saga/effects';

import {
	ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
	MAIN_WINDOW_INSTALL_UPDATE_CLICKED,
	UPDATES_READY,
	UPDATES_CHECKING_FOR_UPDATE,
	UPDATES_ERROR_THROWN,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_UPDATE_DOWNLOADED,
} from '../actions';
import { readFromStorage } from '../localStorage';
import { createEventChannelFromEmitter, keepStoreValuePersisted, readConfigurationFile } from '../sagaUtils';

const { autoUpdater, CancellationToken } = remote.require('electron-updater');

const isUpdatingAllowed = (process.platform === 'linux' && !!process.env.APPIMAGE)
	|| (process.platform === 'win32' && !process.windowsStore)
	|| (process.platform === 'darwin' && !process.mas);

const loadAppConfiguration = async (configuration) => {
	const appConfiguration = await readConfigurationFile('update.json', { appData: true });

	if (!appConfiguration) {
		return false;
	}

	try {
		const {
			forced,
			autoUpdate,
			canUpdate,
			skip,
		} = appConfiguration;

		if (forced !== undefined) {
			configuration.isEachUpdatesSettingConfigurable = !forced;
		}

		if (canUpdate !== undefined) {
			configuration.isUpdatingEnabled = Boolean(canUpdate);
		}

		if (autoUpdate !== undefined) {
			configuration.doCheckForUpdatesOnStartup = Boolean(autoUpdate);
		}

		if (skip !== undefined) {
			configuration.skippedUpdateVersion = String(skip);
		}

		return forced;
	} catch (error) {
		console.warn(error);
		return false;
	}
};

export const loadUserConfiguration = async (configuration) => {
	const userConfiguration = await readConfigurationFile('update.json', { appData: false, purgeAfter: true });

	if (!userConfiguration) {
		return;
	}

	try {
		const {
			autoUpdate,
			skip,
		} = userConfiguration;

		if (autoUpdate !== undefined) {
			configuration.doCheckForUpdatesOnStartup = Boolean(autoUpdate);
		}

		if (skip !== undefined) {
			configuration.skippedUpdateVersion = String(skip);
		}
	} catch (error) {
		console.error(error);
	}
};

function *loadConfiguration() {
	const configuration = yield select(({
		isEachUpdatesSettingConfigurable,
		isUpdatingEnabled,
		doCheckForUpdatesOnStartup,
		skippedUpdateVersion,
	}) => ({
		isUpdatingAllowed,
		isEachUpdatesSettingConfigurable,
		isUpdatingEnabled,
		doCheckForUpdatesOnStartup,
		skippedUpdateVersion,
	}));

	const forced = yield call(loadAppConfiguration, configuration);

	if (forced) {
		return configuration;
	}

	configuration.isUpdatingEnabled = readFromStorage('isUpdatingEnabled', configuration.isUpdatingEnabled);
	configuration.doCheckForUpdatesOnStartup = readFromStorage('doCheckForUpdatesOnStartup', configuration.doCheckForUpdatesOnStartup);
	configuration.skippedUpdateVersion = readFromStorage('skippedUpdateVersion', configuration.skippedUpdateVersion);

	yield call(loadUserConfiguration, configuration);

	return configuration;
}

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
		remote.app.removeAllListeners('window-all-closed');
		yield call(::autoUpdater.quitAndInstall);
	} catch (error) {
		yield put({ type: UPDATES_ERROR_THROWN, payload: error });
	}
}

function *takeActions() {
	yield takeEvery(ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED, function *() {
		yield *check();
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

	const checkingForUpdateChannel = createEventChannelFromEmitter(autoUpdater, 'checking-for-update');
	const updateAvailableChannel = createEventChannelFromEmitter(autoUpdater, 'update-available');
	const updateNotAvailableChannel = createEventChannelFromEmitter(autoUpdater, 'update-not-available');
	const updateDownloadedChannel = createEventChannelFromEmitter(autoUpdater, 'update-downloaded');
	const errorChannel = createEventChannelFromEmitter(autoUpdater, 'error');

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
	const {
		isUpdatingAllowed,
		isEachUpdatesSettingConfigurable,
		isUpdatingEnabled,
		doCheckForUpdatesOnStartup,
		skippedUpdateVersion,
	} = yield *loadConfiguration();

	yield *keepStoreValuePersisted('doCheckForUpdatesOnStartup');
	yield *keepStoreValuePersisted('skippedUpdateVersion');

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

	yield *takeAutoUpdaterEvents();
	yield *takeActions();
}
