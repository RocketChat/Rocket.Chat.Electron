import { ipcMain } from 'electron';
import idle from '@paulcbetts/system-idle-time';

ipcMain.on('request-system-idle-time', (event) => {
	event.returnValue = idle.getIdleTime();
});
