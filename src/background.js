import { app } from 'electron';
import querystring from 'querystring';
import url from 'url';
import appData from './background/appData';
import { getMainWindow } from './background/mainWindow';
import './background/systemIdleTime';
import './background/updates';
import './background/dialogs/about';
import './background/dialogs/screenshare';
import './background/dialogs/update';
import i18n from './i18n';
export { default as dock } from './background/dock';
export { default as menus } from './background/menus';
export { default as tray } from './background/tray';
export { default as notifications } from './background/notifications';
export { default as remoteServers } from './background/servers';
export { default as certificate } from './background/certificateStore';


function parseCommandLineArguments(args) {
	args
		.filter((arg) => /^rocketchat:\/\/./.test(arg))
		.map((uri) => url.parse(uri))
		.map(({ hostname, pathname, query }) => {
			const { insecure } = querystring.parse(query);
			return `${ insecure === 'true' ? 'http' : 'https' }://${ hostname }${ pathname || '' }`;
		})
		.slice(0, 1)
		.forEach(async(serverUrl) => {
			const mainWindow = await getMainWindow();
			mainWindow.send('add-host', serverUrl);
		});
}

function handleUncaughtException(error) {
	console.error(error);
	app.exit(1);
}

function handleUnhandledRejection(reason) {
	console.error(reason);
	app.exit(1);
}

async function prepareApp() {
	process.on('uncaughtException', handleUncaughtException);
	process.on('unhandledRejection', handleUnhandledRejection);

	app.setAsDefaultProtocolClient('rocketchat');
	app.setAppUserModelId('chat.rocket');

	// TODO: make it a setting
	if (process.platform === 'linux') {
		app.disableHardwareAcceleration();
	}

	app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

	app.on('window-all-closed', () => {
		app.quit();
	});

	app.on('open-url', (event, url) => {
		event.preventDefault();
		parseCommandLineArguments([url]);
	});

	app.on('second-instance', async(event, argv) => {
		parseCommandLineArguments(argv.slice(2));
	});

	appData.initialize();

	const canStart = process.mas || app.requestSingleInstanceLock();

	if (!canStart) {
		app.quit();
		return;
	}
}

(async() => {
	await prepareApp();
	await app.whenReady();
	await i18n.initialize();
	app.emit('start');
	await getMainWindow();
	parseCommandLineArguments(process.argv.slice(2));
})();
