import { app } from 'electron';
import { spawn, call, take, takeEvery } from 'redux-saga/effects';

import { dockSaga } from './dock';
import { trayIconSaga } from './trayIcon';
import { setupI18next } from '../../i18n';
import { appReadyChannel, eventEmitterChannel } from '../channels';
import { rootWindowSaga } from './rootWindow';
import { menuBarSaga } from './menuBar';
import { touchBarSaga } from './touchBar';

function *watchAppEvents() {
	const preventEvent = (event) => {
		event.preventDefault();
	};

	app.addListener('certificate-error', preventEvent);
	app.addListener('select-client-certificate', preventEvent);
	app.addListener('login', preventEvent);
	app.addListener('open-url', preventEvent);

	const appWindowAllClosedEvent = eventEmitterChannel(app, 'window-all-closed');

	yield takeEvery(appWindowAllClosedEvent, function *() {
		app.quit();
	});
}

export function *rootSaga() {
	yield spawn(watchAppEvents);

	yield take(appReadyChannel());
	yield call(setupI18next);

	yield spawn(dockSaga);
	yield spawn(trayIconSaga);

	const rootWindow = yield call(rootWindowSaga);

	yield spawn(menuBarSaga, rootWindow);
	yield spawn(touchBarSaga, rootWindow);
}
