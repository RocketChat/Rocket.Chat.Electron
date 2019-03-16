import { app, BrowserWindow, ipcMain } from 'electron';
import { getMainWindow } from '../mainWindow';
import i18n from '../../i18n';


let window;

async function open() {
	if (window) {
		return;
	}

	const mainWindow = await getMainWindow();
	window = new BrowserWindow({
		width: 776,
		height: 600,
		useContentSize: true,
		center: true,
		resizable: false,
		minimizable: false,
		maximizable: false,
		fullscreen: false,
		fullscreenable: false,
		skipTaskbar: true,
		title: i18n.__('dialog.screenshare.title'),
		show: false,
		parent: mainWindow,
		modal: process.platform !== 'darwin',
		backgroundColor: '#F4F4F4',
		type: process.platform === 'darwin' ? 'desktop' : 'toolbar',
		webPreferences: {
			devTools: false,
			nodeIntegration: true,
		},
	});
	window.setMenuBarVisibility(false);

	window.once('ready-to-show', () => {
		window.show();
	});

	window.once('closed', () => {
		if (!window.resultSent) {
			mainWindow.webContents.send('screenshare-result', 'PermissionDeniedError');
		}
		window = null;
	});

	window.loadFile(`${ app.getAppPath() }/app/public/dialogs/screenshare.html`);
}

function close() {
	if (window) {
		window.destroy();
	}
}

async function selectSource(id) {
	const mainWindow = await getMainWindow();
	mainWindow.webContents.send('screenshare-result', id);
	if (window) {
		window.resultSent = true;
		window.destroy();
	}
}

ipcMain.on('open-screenshare-dialog', (e, ...args) => open(...args));
ipcMain.on('close-screenshare-dialog', (e, ...args) => close(...args));
ipcMain.on('select-screenshare-source', (e, ...args) => selectSource(...args));
