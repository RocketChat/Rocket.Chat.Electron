import fs from 'fs';
import path from 'path';

import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { takeEvery, call, put } from 'redux-saga/effects';

import {
	UPDATES_ERROR_THROWN,
	UPDATES_CHECKING_FOR_UPDATE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_READY,
	UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
	UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED,
	UPDATES_CHECK_FOR_UPDATES_REQUESTED,
} from '../actions';
import {
	EVENT_UPDATE_DOWNLOAD_ALLOWED,
	EVENT_UPDATE_SKIPPED,
} from '../ipc';
import {
	selectSkippedUpdateVersion,
	selectUpdateConfiguration,
} from '../selectors';
import {
	askUpdateInstall,
	AskUpdateInstallResponse,
	warnAboutInstallUpdateLater,
	warnAboutUpdateDownload,
	warnAboutUpdateSkipped,
} from './ui/dialogs';

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

const loadConfiguration = async (reduxStore) => {
	const defaultConfiguration = selectUpdateConfiguration(reduxStore.getState());
	const appConfiguration = await loadAppConfiguration();

	const configuration = {
		...defaultConfiguration,
		...appConfiguration.forced ? { isEachUpdatesSettingConfigurable: false } : {},
		...appConfiguration.canUpdate ? { doCheckForUpdatesOnStartup: true } : {},
		...appConfiguration.autoUpdate ? { doCheckForUpdatesOnStartup: true } : {},
		...appConfiguration.skip ? { skippedUpdateVersion: String(appConfiguration.skip) } : {},
	};

	if (configuration.isEachUpdatesSettingConfigurable) {
		const userConfiguration = await loadUserConfiguration();

		if (userConfiguration.autoUpdate) {
			configuration.doCheckForUpdatesOnStartup = true;
		}

		if (userConfiguration.skip) {
			configuration.skippedUpdateVersion = String(userConfiguration.skip);
		}
	}

	return configuration;
};

export const setupUpdates = async (reduxStore, rootWindow) => {
	autoUpdater.autoDownload = false;

	const isUpdatingAllowed = (process.platform === 'linux' && !!process.env.APPIMAGE)
		|| (process.platform === 'win32' && !process.windowsStore)
		|| (process.platform === 'darwin' && !process.mas);

	const {
		isEachUpdatesSettingConfigurable,
		isUpdatingEnabled,
		doCheckForUpdatesOnStartup,
		skippedUpdateVersion,
	} = await loadConfiguration(reduxStore);

	reduxStore.dispatch({
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

	autoUpdater.addListener('checking-for-update', () => {
		reduxStore.dispatch({ type: UPDATES_CHECKING_FOR_UPDATE });
	});

	autoUpdater.addListener('update-available', ({ version }) => {
		const skippedUpdateVersion = selectSkippedUpdateVersion(reduxStore.getState());
		if (skippedUpdateVersion === version) {
			reduxStore.dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
			return;
		}

		reduxStore.dispatch({ type: UPDATES_NEW_VERSION_AVAILABLE, payload: version });
	});

	autoUpdater.addListener('update-not-available', () => {
		reduxStore.dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
	});

	autoUpdater.addListener('update-downloaded', async () => {
		const response = await askUpdateInstall(rootWindow);

		if (response === AskUpdateInstallResponse.INSTALL_LATER) {
			await warnAboutInstallUpdateLater(rootWindow);
			return;
		}

		try {
			app.removeAllListeners('window-all-closed');
			autoUpdater.quitAndInstall(true, true);
		} catch (error) {
			reduxStore.dispatch({
				type: UPDATES_ERROR_THROWN,
				payload: {
					message: error.message,
					stack: error.stack,
					name: error.name,
				},
			});
		}
	});

	autoUpdater.addListener('error', (error) => {
		reduxStore.dispatch({
			type: UPDATES_ERROR_THROWN,
			payload: {
				message: error.message,
				stack: error.stack,
				name: error.name,
			},
		});
	});

	ipcMain.addListener(EVENT_UPDATE_DOWNLOAD_ALLOWED, async () => {
		await warnAboutUpdateDownload(rootWindow);
		reduxStore.dispatch({ type: UPDATE_DIALOG_DOWNLOAD_UPDATE_CLICKED });

		try {
			autoUpdater.downloadUpdate();
		} catch (error) {
			reduxStore.dispatch({
				type: UPDATES_ERROR_THROWN,
				payload: {
					message: error.message,
					stack: error.stack,
					name: error.name,
				},
			});
		}
	});

	ipcMain.addListener(EVENT_UPDATE_SKIPPED, async (newVersion) => {
		await warnAboutUpdateSkipped(rootWindow);
		reduxStore.dispatch({ type: UPDATE_DIALOG_SKIP_UPDATE_CLICKED, payload: newVersion });
	});

	if (doCheckForUpdatesOnStartup) {
		try {
			await autoUpdater.checkForUpdates();
		} catch (error) {
			reduxStore.dispatch({
				type: UPDATES_ERROR_THROWN,
				payload: {
					message: error.message,
					stack: error.stack,
					name: error.name,
				},
			});
		}
	}
};

export function *takeUpdateActions() {
	yield takeEvery(UPDATES_CHECK_FOR_UPDATES_REQUESTED, function *() {
		try {
			yield call(() => autoUpdater.checkForUpdates());
		} catch (error) {
			yield put({
				type: UPDATES_ERROR_THROWN,
				payload: {
					message: error.message,
					stack: error.stack,
					name: error.name,
				},
			});
		}
	});
}
