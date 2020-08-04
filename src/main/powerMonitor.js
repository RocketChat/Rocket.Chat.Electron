import { powerMonitor, webContents, ipcMain } from 'electron';
import { takeEvery, call } from 'redux-saga/effects';

import { eventEmitterChannel } from './channels';
import { SEND_SUSPEND, SEND_LOCK_SCREEN, INVOKE_SYSTEM_IDLE_STATE } from '../ipc';

export function *setupPowerMonitor() {
	yield takeEvery(eventEmitterChannel(powerMonitor, 'suspend'), function *() {
		yield call(() => {
			webContents.getAllWebContents().forEach((webContents) => {
				webContents.send(SEND_SUSPEND);
			});
		});
	});

	yield takeEvery(eventEmitterChannel(powerMonitor, 'lock-screen'), function *() {
		yield call(() => {
			webContents.getAllWebContents().forEach((webContents) => {
				webContents.send(SEND_LOCK_SCREEN);
			});
		});
	});

	yield call(() => {
		ipcMain.handle(INVOKE_SYSTEM_IDLE_STATE, (event, idleThreshold) =>
			powerMonitor.getSystemIdleState(idleThreshold));
	});
}
