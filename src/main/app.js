import { app } from 'electron';
import { takeEvery, getContext, call } from 'redux-saga/effects';
import rimraf from 'rimraf';

import {
	MENU_BAR_DISABLE_GPU,
	MENU_BAR_QUIT_CLICKED,
	MENU_BAR_RESET_APP_DATA_CLICKED,
	TRAY_ICON_QUIT_CLICKED,
} from '../actions';
import { eventEmitterChannel } from './channels';
import { askForAppDataReset } from './ui/dialogs';

export const relaunchApp = (...args) => {
	const command = process.argv.slice(1, app.isPackaged ? 1 : 2);
	app.relaunch({ args: [...command, ...args] });
	app.exit();
};

export const performStartup = () => {
	app.setAsDefaultProtocolClient('rocketchat');
	app.setAppUserModelId('chat.rocket');

	app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

	const args = process.argv.slice(app.isPackaged ? 1 : 2);

	if (args.includes('--reset-app-data')) {
		rimraf.sync(app.getPath('userData'));
		relaunchApp();
		return;
	}

	const canStart = process.mas || app.requestSingleInstanceLock();

	if (!canStart) {
		app.exit();
		return;
	}

	if (args.includes('--disable-gpu')) {
		app.disableHardwareAcceleration();
		app.commandLine.appendSwitch('--disable-2d-canvas-image-chromium');
		app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
		app.commandLine.appendSwitch('--disable-gpu');
	}
};

export const getPlatform = () => process.platform;

export function *waitForAppReady() {
	yield call(app.whenReady);
}

function *watchEvents() {
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

export function *setupApp() {
	yield *watchEvents();
}
