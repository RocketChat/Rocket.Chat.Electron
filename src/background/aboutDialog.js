import { app, BrowserWindow } from 'electron';
import { getMainWindow } from './mainWindow';
import i18n from '../i18n/index.js';

export default async() => {
	const mainWindow = await getMainWindow();
	const win = new BrowserWindow({
		title: i18n.__('About %s', app.getName()),
		parent: mainWindow,
		width: 400,
		height: 300,
		type: 'toolbar',
		resizable: false,
		maximizable: false,
		minimizable: false,
		center: true,
		show: false,
	});
	win.setMenuBarVisibility(false);
	win.once('ready-to-show', () => win.show());
	win.loadURL(`file://${ __dirname }/public/about.html`);
};
