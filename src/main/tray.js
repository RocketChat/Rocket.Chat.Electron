import { app, Menu, systemPreferences, Tray as TrayIcon } from 'electron';
import { EventEmitter } from 'events';
import i18n from '../i18n';
import { getTrayIconImage } from './icon';


const getIconTitle = ({ badge }) => (Number.isInteger(badge) ? String(badge) : '');

const getIconTooltip = ({ badge }) => {
	const appName = app.getName();

	if (badge === '•') {
		return i18n.__('tray.tooltip.unreadMessage', { appName });
	}

	if (Number.isInteger(badge)) {
		return i18n.__('tray.tooltip.unreadMention', { appName, count: badge });
	}

	return i18n.__('tray.tooltip.noUnreadMessage', { appName });
};

const createContextMenuTemplate = ({ isMainWindowVisible }, events) => ([
	{
		label: !isMainWindowVisible ? i18n.__('tray.menu.show') : i18n.__('tray.menu.hide'),
		click: () => events.emit('set-main-window-visibility', !isMainWindowVisible),
	},
	{
		label: i18n.__('tray.menu.quit'),
		click: () => events.emit('quit'),
	},
]);

let trayIcon = null;

let state = {
	badge: null,
	isMainWindowVisible: true,
	showIcon: true,
};

const instance = new (class Tray extends EventEmitter {});

let darwinThemeSubscriberId = null;

const createIcon = () => {
	const image = getTrayIconImage({ badge: state.badge });

	if (trayIcon) {
		trayIcon.setImage(image);
		return;
	}

	trayIcon = new TrayIcon(image);

	if (process.platform === 'darwin') {
		darwinThemeSubscriberId = systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => {
			trayIcon.setImage(getTrayIconImage({ badge: state.badge }));
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
