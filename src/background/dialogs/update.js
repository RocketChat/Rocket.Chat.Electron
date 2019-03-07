import { app, BrowserWindow, ipcMain } from 'electron';
import { getMainWindow } from '../mainWindow';
import i18n from '../../i18n';


let window;

async function open({ currentVersion = app.getVersion(), newVersion } = {}) {
	if (window) {
		return;
	}

	const mainWindow = await getMainWindow();
	window = new BrowserWindow({
		width: 600,
		height: 330,
		useContentSize: true,
		center: true,
		resizable: false,
		minimizable: false,
		maximizable: false,
		fullscreen: false,
		fullscreenable: false,
		skipTaskbar: true,
		title: i18n.__('dialog.update.title'),
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
		window = null;
	});

	window.params = { currentVersion, newVersion };

	window.loadFile(`${ app.getAppPath() }/app/public/dialogs/update.html`);
}

function close() {
	if (window) {
		window.destroy();
	}
}

ipcMain.on('open-update-dialog', (e, ...args) => open(...args));
ipcMain.on('close-update-dialog', (e, ...args) => close(...args));
