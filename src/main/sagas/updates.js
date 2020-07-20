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
} from '../../actions';
import { eventEmitterChannel } from '../channels';

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
		app.removeAllListeners('window-all-closed');
		yield call(::autoUpdater.quitAndInstall);
	} catch (error) {
		yield put({ type: UPDATES_ERROR_THROWN, payload: error });
	}
}

export function *updatesSaga() {
	autoUpdater.autoDownload = false;

	yield takeEvery(eventEmitterChannel(autoUpdater, 'checking-for-update'), function *() {
		yield put({ type: UPDATES_CHECKING_FOR_UPDATE });
	});

	yield takeEvery(eventEmitterChannel(autoUpdater, 'update-available'), function *([{ version }]) {
		const skippedUpdateVersion = yield select(({ skippedUpdateVersion }) => skippedUpdateVersion);
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
