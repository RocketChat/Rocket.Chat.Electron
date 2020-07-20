import { app, dialog } from 'electron';
import { t } from 'i18next';
import { takeEvery } from 'redux-saga/effects';

import {
	MENU_BAR_DISABLE_GPU,
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
} from '../../actions';
import { eventEmitterChannel } from '../channels';

const relaunchWithFlag = (flag) => {
	const command = process.argv.slice(1, app.isPackaged ? 1 : 2);
	app.relaunch({ args: [...command, flag] });
	app.exit();
};

const askForAppDataReset = async (rootWindow) => {
	const { response } = await dialog.showMessageBox(rootWindow, {
		type: 'question',
		buttons: [t('dialog.resetAppData.yes'), t('dialog.resetAppData.cancel')],
		defaultId: 1,
		title: t('dialog.resetAppData.title'),
		message: t('dialog.resetAppData.message'),
	});

	if (response !== 0) {
		return;
	}

	relaunchWithFlag('--reset-app-data');
};

export function *appSaga(rootWindow) {
	yield takeEvery(eventEmitterChannel(app, 'window-all-closed'), function *() {
		app.quit();
	});

	yield takeEvery([MENU_BAR_QUIT_CLICKED, TRAY_ICON_QUIT_CLICKED], function *() {
		app.quit();
	});

	yield takeEvery(MENU_BAR_DISABLE_GPU, function *() {
		relaunchWithFlag('--disable-gpu');
	});

	yield takeEvery(MENU_BAR_RESET_APP_DATA_CLICKED, function *() {
		askForAppDataReset(rootWindow);
	});
}
