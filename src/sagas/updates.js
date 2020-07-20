import { remote } from 'electron';
import { call, put, select } from 'redux-saga/effects';

import {
	UPDATES_READY,
	UPDATES_ERROR_THROWN,
} from '../actions';
import { readFromStorage } from '../localStorage';
import { readConfigurationFile } from '../sagaUtils';

const { autoUpdater } = remote.require('electron-updater');

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

export function *updatesSaga() {
	const {
		isUpdatingAllowed,
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

	if (isUpdatingAllowed && isUpdatingEnabled && doCheckForUpdatesOnStartup) {
		yield *check();
	}
}
