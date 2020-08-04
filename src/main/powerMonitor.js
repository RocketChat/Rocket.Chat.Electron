import { powerMonitor, webContents, ipcMain } from 'electron';
import { call } from 'redux-saga/effects';

import {
	EVENT_SYSTEM_SUSPENDING,
	EVENT_SYSTEM_LOCKING_SCREEN,
	QUERY_SYSTEM_IDLE_STATE,
} from '../ipc';

export function *setupPowerMonitor() {
	yield call(() => {
		powerMonitor.addListener('suspend', () => {
			webContents.getAllWebContents().forEach((webContents) => {
				webContents.send(EVENT_SYSTEM_SUSPENDING);
			});
		});

		powerMonitor.addListener('lock-screen', () => {
			webContents.getAllWebContents().forEach((webContents) => {
				webContents.send(EVENT_SYSTEM_LOCKING_SCREEN);
			});
		});

		ipcMain.handle(QUERY_SYSTEM_IDLE_STATE, (event, idleThreshold) =>
			powerMonitor.getSystemIdleState(idleThreshold));
	});
}
