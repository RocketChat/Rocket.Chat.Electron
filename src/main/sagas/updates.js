import fs from 'fs';
import path from 'path';

import { app } from 'electron';
import { autoUpdater, CancellationToken } from 'electron-updater';
import { select, call, put, takeEvery } from 'redux-saga/effects';

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
} from '../../actions';
import { eventEmitterChannel } from '../channels';
import {
	selectIsUpdatingAllowed,
	selectIsUpdatingEnabled,
	selectSkippedUpdateVersion,
} from '../selectors';
import { readFromStorage } from '../localStorage';

const getConfigurationPath = (filePath, { appData = true } = {}) => path.join(
	...appData ? [
		app.getAppPath(),
		app.getAppPath().endsWith('app.asar') ? '..' : '.',
	] : [app.getPath('userData')],
	filePath,
);

const readConfigurationFile = async (filePath, {
	appData = true,
	purgeAfter = false,
} = {}) => {
	try {
		const configurationFilePath = getConfigurationPath(filePath, { appData });

		if (!await fs.promises.stat(filePath).then((stat) => stat.isFile(), () => false)) {
			return null;
		}

		const content = JSON.parse(await fs.promises.readFile(configurationFilePath, 'utf8'));

		if (!appData && purgeAfter) {
			await fs.promises.unlink(configurationFilePath);
		}

		return content;
	} catch (error) {
		console.warn(error);
		return null;
	}
};

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

const loadUserConfiguration = async (configuration) => {
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

function *loadConfiguration(rootWindow) {
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

	configuration.isUpdatingEnabled = yield call(readFromStorage, rootWindow, 'isUpdatingEnabled', configuration.isUpdatingEnabled);
	configuration.doCheckForUpdatesOnStartup = yield call(readFromStorage, rootWindow, 'doCheckForUpdatesOnStartup', configuration.doCheckForUpdatesOnStartup);
	configuration.skippedUpdateVersion = yield call(readFromStorage, rootWindow, 'skippedUpdateVersion', configuration.skippedUpdateVersion);

	yield call(loadUserConfiguration, configuration);

	return configuration;
}

function *check() {
	const isUpdatingAllowed = yield select(selectIsUpdatingAllowed);
	const isUpdatingEnabled = yield select(selectIsUpdatingEnabled);

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
	const isUpdatingAllowed = yield select(selectIsUpdatingAllowed);
	const isUpdatingEnabled = yield select(selectIsUpdatingEnabled);

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
	const isUpdatingAllowed = yield select(selectIsUpdatingAllowed);
	const isUpdatingEnabled = yield select(selectIsUpdatingEnabled);

	if (!isUpdatingAllowed || !isUpdatingEnabled) {
		return;
	}

	try {
		app.removeAllListeners('window-all-closed');
		yield call(::autoUpdater.quitAndInstall);
	} catch (error) {
		yield put({ type: UPDATES_ERROR_THROWN, payload: error });
	}
}

export function *updatesSaga(rootWindow) {
	autoUpdater.autoDownload = false;

	const {
		isUpdatingAllowed,
		isEachUpdatesSettingConfigurable,
		isUpdatingEnabled,
		doCheckForUpdatesOnStartup,
		skippedUpdateVersion,
	} = yield *loadConfiguration(rootWindow);

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
		yield *check();
	});

	yield takeEvery(UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED, function *() {
		yield *download();
	});

	yield takeEvery(ROOT_WINDOW_INSTALL_UPDATE_CLICKED, function *() {
		yield *install();
	});
}
