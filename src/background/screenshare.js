import { BrowserWindow, ipcMain } from 'electron';

let screenshareEvent;
ipcMain.on('screenshare', (event, sources) => {
	screenshareEvent = event;
	let mainWindow = new BrowserWindow({
		width: 776,
		height: 600,
		show : false,
		skipTaskbar: false,
	});

	mainWindow.loadURL(`file://${ __dirname }/../public/screenshare.html`);

	// window.openDevTools();
	mainWindow.webContents.on('did-finish-load', () => {
		mainWindow.webContents.send('sources', sources);
		mainWindow.show();
	});

	mainWindow.on('closed', () => {
		mainWindow = null;
		if (screenshareEvent) {
			screenshareEvent.sender.send('screenshare-result', 'PermissionDeniedError');
			screenshareEvent = null;
		}
	});
});

ipcMain.on('source-result', (e, sourceId) => {
	if (screenshareEvent) {
		screenshareEvent.sender.send('screenshare-result', sourceId);
		screenshareEvent = null;
	}
});
