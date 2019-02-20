import { app, Menu, systemPreferences, Tray as TrayIcon } from 'electron';
import { EventEmitter } from 'events';
import i18n from '../i18n';
import { getTrayIconImage } from './icon';


const getIconTitle = ({ badge: { title, count } }) => ((count > 0) ? title : '');

const getIconTooltip = ({ badge: { title, count } }) => {
	if (title === '•') {
		return i18n.__('%s: you have unread messages', app.getName());
	}

	if (count === 1) {
		return i18n.__('%s: you have a unread mention/direct message', app.getName());
	}

	if (count > 1) {
		return i18n.__('%s: you have %c unread mentions/direct messages', app.getName(), count);
	}

	return i18n.__('%s: no unread messages', app.getName());
};

const createContextMenuTemplate = ({ isMainWindowVisible }, events) => ([
	{
		label: !isMainWindowVisible ? i18n.__('Show') : i18n.__('Hide'),
		click: () => events.emit('set-main-window-visibility', !isMainWindowVisible),
	},
	{
		label: i18n.__('Quit'),
		click: () => events.emit('quit'),
	},
]);

let trayIcon = null;

let state = {
	badge: {
		title: '',
		count: 0,
	},
	isMainWindowVisible: true,
	showIcon: true,
};

const instance = new (class Tray extends EventEmitter {});

let darwinThemeSubscriberId = null;

const createIcon = () => {
	const image = getTrayIconImage(state.badge);

	if (trayIcon) {
		trayIcon.setImage(image);
		return;
	}

	trayIcon = new TrayIcon(image);

	if (process.platform === 'darwin') {
		darwinThemeSubscriberId = systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => {
			trayIcon.setImage(getTrayIconImage(state.badge));
		});
	}

	trayIcon.on('click', () => instance.emit('set-main-window-visibility', !state.isMainWindowVisible));
	trayIcon.on('right-click', (event, bounds) => trayIcon.popUpContextMenu(undefined, bounds));

	instance.emit('created');
};

const destroyIcon = () => {
	if (!trayIcon) {
		return;
	}

	if (process.platform === 'darwin' && darwinThemeSubscriberId) {
		systemPreferences.unsubscribeNotification(darwinThemeSubscriberId);
		darwinThemeSubscriberId = null;
	}


	trayIcon.destroy();
	instance.emit('destroyed');
	trayIcon = null;
};

const destroy = () => {
	destroyIcon();
	instance.removeAllListeners();
};

const update = () => {
	if (!state.showIcon) {
		destroyIcon();
		instance.emit('update');
		return;
	}

	createIcon();

	trayIcon.setToolTip(getIconTooltip(state));

	if (process.platform === 'darwin') {
		trayIcon.setTitle(getIconTitle(state));
	}

	const template = createContextMenuTemplate(state, instance);
	const menu = Menu.buildFromTemplate(template);
	trayIcon.setContextMenu(menu);
	instance.emit('update');
};

const setState = (partialState) => {
	state = {
		...state,
		...partialState,
	};
	update();
};

export default Object.assign(instance, {
	destroy,
	setState,
});
