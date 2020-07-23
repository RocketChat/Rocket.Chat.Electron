import { app } from 'electron';
import { takeEvery, getContext, call } from 'redux-saga/effects';

import {
	MENU_BAR_DISABLE_GPU,
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
} from '../../actions';
import { eventEmitterChannel } from '../channels';
import { askForAppDataReset } from '../dialogs';
import { relaunchApp } from '../app';

export function *waitForAppReady() {
	yield call(app.whenReady);
}

export function *watchApp() {
	yield takeEvery(eventEmitterChannel(app, 'window-all-closed'), function *() {
		yield call(app.quit);
	});

	yield takeEvery([MENU_BAR_QUIT_CLICKED, TRAY_ICON_QUIT_CLICKED], function *() {
		yield call(app.quit);
	});

	yield takeEvery(MENU_BAR_DISABLE_GPU, function *() {
		yield call(relaunchApp, '--disable-gpu');
	});

	yield takeEvery(MENU_BAR_RESET_APP_DATA_CLICKED, function *() {
		const permitted = yield call(askForAppDataReset, yield getContext('rootWindow'));

		if (permitted) {
			yield call(relaunchApp, '--reset-app-data');
		}
	});
}
