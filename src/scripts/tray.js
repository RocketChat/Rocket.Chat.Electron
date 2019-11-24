import { EventEmitter } from 'events';

import { remote } from 'electron';
import { t } from 'i18next';

import { getTrayIconPath } from './icon';

const { app, Menu, nativeTheme, Tray: TrayIcon } = remote;

const getIconTitle = ({ badge }) => (Number.isInteger(badge) ? String(badge) : '');

const getIconTooltip = ({ badge }) => {
	if (badge === '•') {
		return t('tray.tooltip.unreadMessage', { appName: app.name });
	}

	if (Number.isInteger(badge)) {
		return t('tray.tooltip.unreadMention', { appName: app.name, count: badge });
	}

	return t('tray.tooltip.noUnreadMessage', { appName: app.name });
};

const createContextMenuTemplate = ({ isMainWindowVisible }, events) => [
	{
		label: !isMainWindowVisible ? t('tray.menu.show') : t('tray.menu.hide'),
		click: () => events.emit('set-main-window-visibility', !isMainWindowVisible),
	},
	{
		label: t('tray.menu.quit'),
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

	trayIcon.setImage(getTrayIconPath({ badge: state.badge }));
};

const createIcon = () => {
	const image = getTrayIconPath({ badge: state.badge });

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
