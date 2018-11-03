import { app, ipcMain, Menu } from 'electron';
import querystring from 'querystring';
import url from 'url';
import idle from '@paulcbetts/system-idle-time';

import appData from './background/appData';
import autoUpdate from './background/autoUpdate';
import certificate from './background/certificate';
import dock from './background/dock';
import { addServer, getMainWindow } from './background/mainWindow';
import menus from './background/menus';
import './background/screenshare';
import tray from './background/tray';

import i18n from './i18n/index.js';

export { default as showAboutDialog } from './background/aboutDialog';
export { default as remoteServers } from './background/servers';
export { certificate, dock, menus, tray };


process.env.GOOGLE_API_KEY = 'AIzaSyADqUh_c1Qhji3Cp1NE43YrcpuPkmhXD-c';

const unsetDefaultApplicationMenu = () => {
	if (process.platform !== 'darwin') {
		Menu.setApplicationMenu(null);
		return;
	}

	const emptyMenuTemplate = [{
		submenu: [
			{
				label: i18n.__('&Quit %s', app.getName()),
				accelerator: 'CommandOrControl+Q',
				click() {
					app.quit();
				},
			},
		],
	}];
	Menu.setApplicationMenu(Menu.buildFromTemplate(emptyMenuTemplate));
};

const parseProtocolUrls = (args) =>
	args.filter((arg) => /^rocketchat:\/\/./.test(arg))
		.map((uri) => url.parse(uri))
		.map(({ hostname, pathname, query }) => {
			const { insecure } = querystring.parse(query);
			return `${ insecure === 'true' ? 'http' : 'https' }://${ hostname }${ pathname || '' }`;
		});

const addServers = (protocolUrls) => parseProtocolUrls(protocolUrls)
	.forEach((serverUrl) => addServer(serverUrl));

const isSecondInstance = app.makeSingleInstance(async(argv) => {
	(await getMainWindow()).show();
	addServers(argv.slice(2));
});

if (isSecondInstance && !process.mas) {
	app.quit();
}

// macOS only
app.on('open-url', (event, url) => {
	event.preventDefault();
	addServers([url]);
});

app.on('window-all-closed', () => {
	app.quit();
});

if (!app.isDefaultProtocolClient('rocketchat')) {
	app.setAsDefaultProtocolClient('rocketchat');
}

app.setAppUserModelId('chat.rocket');
if (process.platform === 'linux') {
	app.disableHardwareAcceleration();
}

app.on('ready', async() => {
	unsetDefaultApplicationMenu();

	appData.initialize();

	const mainWindow = await getMainWindow();
	certificate.initWindow(mainWindow);

	autoUpdate();
});

ipcMain.on('getSystemIdleTime', (event) => {
	event.returnValue = idle.getIdleTime();
});

process.on('unhandledRejection', console.error.bind(console));
