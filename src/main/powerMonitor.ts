import { powerMonitor, webContents, ipcMain } from 'electron';

import {
	EVENT_SYSTEM_SUSPENDING,
	EVENT_SYSTEM_LOCKING_SCREEN,
	QUERY_SYSTEM_IDLE_STATE,
} from '../ipc';

export const setupPowerMonitor = (): void => {
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

	ipcMain.handle(QUERY_SYSTEM_IDLE_STATE, (_event, idleThreshold) =>
		powerMonitor.getSystemIdleState(idleThreshold));
};
