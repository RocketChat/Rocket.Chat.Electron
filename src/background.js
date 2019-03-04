import { app, ipcMain } from 'electron';
import querystring from 'querystring';
import url from 'url';
import appData from './background/appData';
import certificate from './background/certificate';
export { default as dock } from './background/dock';
import { addServer, getMainWindow } from './background/mainWindow';
export { default as menus } from './background/menus';
export { default as notifications } from './background/notifications';
export { default as remoteServers } from './background/servers';
import './background/systemIdleTime';
export { default as tray } from './background/tray';
import './background/updates';
import './background/dialogs/about';
import './background/dialogs/screenshare';
import './background/dialogs/update';
import i18n from './i18n';
export { certificate };


const parseProtocolUrls = (args) =>
	args.filter((arg) => /^rocketchat:\/\/./.test(arg))
		.map((uri) => url.parse(uri))
		.map(({ hostname, pathname, query }) => {
			const { insecure } = querystring.parse(query);
			return `${ insecure === 'true' ? 'http' : 'https' }://${ hostname }${ pathname || '' }`;
		});

const addServers = (protocolUrls) => parseProtocolUrls(protocolUrls)
	.forEach((serverUrl) => addServer(serverUrl));

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
app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

process.on('unhandledRejection', console.error.bind(console));


const gotTheLock = app.requestSingleInstanceLock();

if (gotTheLock) {
	app.on('second-instance', async(event, argv) => {
		(await getMainWindow()).show();
		addServers(argv.slice(2));
	});

	app.on('ready', async() => {
		appData.initialize();
		await i18n.initialize();
		const mainWindow = await getMainWindow();
		certificate.initWindow(mainWindow);

		ipcMain.emit('check-for-updates');
	});
} else {
	app.quit();
}
