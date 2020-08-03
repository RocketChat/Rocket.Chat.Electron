import { powerMonitor, webContents, ipcMain } from 'electron';
import { takeEvery, call } from 'redux-saga/effects';

import { eventEmitterChannel } from './channels';

export function *setupPowerMonitor() {
	yield takeEvery(eventEmitterChannel(powerMonitor, 'suspend'), function *() {
		yield call(() => {
			webContents.getAllWebContents().forEach((webContents) => {
				webContents.send('suspend');
			});
		});
	});

	yield takeEvery(eventEmitterChannel(powerMonitor, 'lock-screen'), function *() {
		yield call(() => {
			webContents.getAllWebContents().forEach((webContents) => {
				webContents.send('lock-screen');
			});
		});
	});

	yield call(() => {
		ipcMain.handle('get-system-idle-state', (event, idleThreshold) =>
			powerMonitor.getSystemIdleState(idleThreshold));
	});
}
