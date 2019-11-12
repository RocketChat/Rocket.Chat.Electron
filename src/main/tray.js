import { EventEmitter } from 'events';

import { app, Menu, nativeTheme, Tray as TrayIcon } from 'electron';

import i18n from '../i18n';
import { getTrayIconImage } from './icon';


const getIconTitle = ({ badge }) => (Number.isInteger(badge) ? String(badge) : '');

const getIconTooltip = ({ badge }) => {
	if (badge === '•') {
		return i18n.__('tray.tooltip.unreadMessage', { appName: app.name });
	}

	if (Number.isInteger(badge)) {
		return i18n.__('tray.tooltip.unreadMention', { appName: app.name, count: badge });
	}

	return i18n.__('tray.tooltip.noUnreadMessage', { appName: app.name });
};

const createContextMenuTemplate = ({ isMainWindowVisible }, events) => [
	{
		label: !isMainWindowVisible ? i18n.__('tray.menu.show') : i18n.__('tray.menu.hide'),
		click: () => events.emit('set-main-window-visibility', !isMainWindowVisible),
	},
	{
		label: i18n.__('tray.menu.quit'),
		click: () => events.emit('quit'),
	},
];

let trayIcon = null;

let state = {
	badge: null,
	isMainWindowVisible: true,
	showIcon: true,
};

const instance = new class Tray extends EventEmitter {}();

const handleThemeUpdate = () => {
	if (!trayIcon) {
		return;
	}

	trayIcon.setImage(getTrayIconImage({ badge: state.badge }));
};

const createIcon = () => {
	const image = getTrayIconImage({ badge: state.badge });

	if (trayIcon) {
		trayIcon.setImage(image);
		return;
	}

	trayIcon = new TrayIcon(image);

	if (process.platform === 'darwin') {
		nativeTheme.on('updated', handleThemeUpdate);
	}

	trayIcon.on('click', () => instance.emit('set-main-window-visibility', !state.isMainWindowVisible));
	trayIcon.on('right-click', (event, bounds) => trayIcon.popUpContextMenu(undefined, bounds));

	instance.emit('created');
};

const destroyIcon = () => {
	if (!trayIcon) {
		return;
	}

	if (process.platform === 'darwin') {
		nativeTheme.off('updated', handleThemeUpdate);
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
