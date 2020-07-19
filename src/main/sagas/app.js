import { app, dialog } from 'electron';
import { t } from 'i18next';
import { call, takeEvery } from 'redux-saga/effects';

import {
	MENU_BAR_DISABLE_GPU,
	MENU_BAR_QUIT_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
} from '../../actions';
import { eventEmitterChannel } from '../channels';

export function *appSaga(rootWindow) {
	const preventEvent = (event) => {
		event.preventDefault();
	};

	app.addListener('certificate-error', preventEvent);
	app.addListener('select-client-certificate', preventEvent);
	app.addListener('login', preventEvent);
	app.addListener('open-url', preventEvent);

	yield takeEvery(eventEmitterChannel(app, 'window-all-closed'), function *() {
		app.quit();
	});

	yield takeEvery(MENU_BAR_DISABLE_GPU, function *() {
		const command = process.argv.slice(1, app.isPackaged ? 1 : 2);

		app.relaunch({ args: [...command, '--disable-gpu'] });
		app.exit();
	});

	yield takeEvery([
		MENU_BAR_QUIT_CLICKED,
		TRAY_ICON_QUIT_CLICKED,
	], function *() {
		app.quit();
	});

	yield takeEvery(MENU_BAR_RESET_APP_DATA_CLICKED, function *() {
		const { response } = yield call(::dialog.showMessageBox, rootWindow, {
			type: 'question',
			buttons: [t('dialog.resetAppData.yes'), t('dialog.resetAppData.cancel')],
			defaultId: 1,
			title: t('dialog.resetAppData.title'),
			message: t('dialog.resetAppData.message'),
		});

		if (response !== 0) {
			return;
		}

		const command = process.argv.slice(1, app.isPackaged ? 1 : 2);

		app.relaunch({ args: [...command, '--reset-app-data'] });
		app.quit();
	});
}
