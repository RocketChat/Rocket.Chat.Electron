import { app } from 'electron';
import { takeEvery } from 'redux-saga/effects';

import {
	MENU_BAR_DISABLE_GPU,
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
} from '../../actions';
import { eventEmitterChannel } from '../channels';
import { askForAppDataReset } from '../dialogs';
import { relaunchApp } from '../startup';

export function *appSaga(rootWindow) {
	yield takeEvery(eventEmitterChannel(app, 'window-all-closed'), function *() {
		app.quit();
	});

	yield takeEvery([MENU_BAR_QUIT_CLICKED, TRAY_ICON_QUIT_CLICKED], function *() {
		app.quit();
	});

	yield takeEvery(MENU_BAR_DISABLE_GPU, function *() {
		relaunchApp('--disable-gpu');
	});

	yield takeEvery(MENU_BAR_RESET_APP_DATA_CLICKED, function *() {
		const permitted = askForAppDataReset(rootWindow);

		if (permitted) {
			relaunchApp('--reset-app-data');
		}
	});
}
