'use strict';

import { remote } from 'electron';
import { EventEmitter } from 'events';
import path from 'path';
import i18n from '../i18n/index.js';

const { Tray, Menu, app, getCurrentWindow, systemPreferences } = remote;

const mainWindow = getCurrentWindow();

const iconsDir = {
	win32: 'windows',
	linux: 'linux',
	darwin: 'osx',
};

const statusBullet = {
	online: '\u001B[32m•',
	away: '\u001B[33m•',
	busy: '\u001B[31m•',
	offline: '\u001B[37m•',
};

const messageCountColor = {
	white: '\u001B[37m',
	black: '\u001B[0m',
};

function getTrayImagePath(badge) {
	let iconFilename;
	if (badge.title === '•') {
		iconFilename = 'icon-tray-dot';
	} else if (badge.count > 0) {
		if (badge.count > 9) {
			iconFilename = 'icon-tray-9plus';
		} else {
			iconFilename = `icon-tray-${ badge.count }`;
		}
	} else if (badge.showAlert) {
		iconFilename = 'icon-tray-alert';
	} else {
		iconFilename = 'icon-tray-Template';
	}

	if (process.platform === 'win32') {
		iconFilename += '.ico';
	} else {
		iconFilename += '.png';
	}

	return path.join(__dirname, 'images', iconsDir[process.platform], iconFilename);
}

const createContextMenuTemplate = ({ isHidden }, events) => ([
	{
		label: isHidden ? i18n.__('Show') : i18n.__('Hide'),
		click: () => events.emit('setVisibility', !isHidden),
	},
	{
		label: i18n.__('Quit'),
		click: () => events.emit('quit'),
	},
]);

function createAppTray() {
	const _tray = new Tray(getTrayImagePath({ title:'', count:0, showAlert:false }));
	_tray.setToolTip(app.getName());

	mainWindow.tray = _tray;

	const events = new EventEmitter();

	const updateContextMenu = () => {
		const state = {
			isHidden: !mainWindow.isMinimized() && !mainWindow.isVisible(),
		};
		const template = createContextMenuTemplate(state, events);
		const menu = Menu.buildFromTemplate(template);
		_tray.setContextMenu(menu);
	};

	events.on('setVisibility', (visible) => {
		visible ? mainWindow.hide() : mainWindow.show();
		updateContextMenu();
	});

	events.on('quit', () => app.quit());

	mainWindow.on('hide', updateContextMenu);
	mainWindow.on('show', updateContextMenu);

	mainWindow.on('minimize', updateContextMenu);
	mainWindow.on('restore', updateContextMenu);

	updateContextMenu();

	_tray.on('right-click', function(event, bounds) {
		_tray.popUpContextMenu(undefined, bounds);
	});

	_tray.on('click', () => {
		if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
			return mainWindow.hide();
		}

		mainWindow.show();
	});

	mainWindow.destroyTray = function() {
		mainWindow.removeListener('hide', updateContextMenu);
		mainWindow.removeListener('show', updateContextMenu);
		mainWindow.removeListener('minimize', updateContextMenu);
		mainWindow.removeListener('restore', updateContextMenu);
		_tray.destroy();
		mainWindow.emit('tray-destroyed');
	};

	mainWindow.emit('tray-created');
}

let state = {
	badge: {
		title: '',
		count: 0,
	},
	status: 'online',
};

function showTrayAlert(badge, status = 'online') {
	if (mainWindow.tray === null || mainWindow.tray === undefined) {
		return;
	}

	state = {
		...state,
		badge,
		status,
	};

	const trayDisplayed = localStorage.getItem('hideTray') !== 'true';
	const statusDisplayed = (localStorage.getItem('showUserStatusInTray') || 'true') === 'true';
	const hasMentions = badge.showAlert && badge.count > 0;

	if (!mainWindow.isFocused()) {
		mainWindow.flashFrame(hasMentions);
	}

	if (process.platform === 'win32') {
		if (hasMentions) {
			mainWindow.webContents.send('render-taskbar-icon', badge.count);
		} else {
			mainWindow.setOverlayIcon(null, '');
		}
	}

	if (process.platform === 'darwin') {
		let countColor = messageCountColor.black;
		if (systemPreferences.isDarkMode()) {
			countColor = messageCountColor.white;
		}

		const trayTitle = [
			statusDisplayed && statusBullet[status],
			hasMentions && `${ countColor }${ badge.title }`,
		].filter(Boolean).join(' ');
		app.dock.setBadge(badge.title);
		if (trayDisplayed) {
			mainWindow.tray.setTitle(trayTitle);
		}
	}

	if (process.platform === 'linux') {
		app.setBadgeCount(badge.count);
	}

	if (trayDisplayed) {
		mainWindow.tray.setImage(getTrayImagePath(badge));
	}
}

function removeAppTray() {
	mainWindow.destroyTray();
}

function toggle() {
	if (localStorage.getItem('hideTray') === 'true') {
		createAppTray();
		localStorage.setItem('hideTray', 'false');
		showTrayAlert(state.badge, state.status);
	} else {
		removeAppTray();
		localStorage.setItem('hideTray', 'true');
	}
}

function toggleStatus() {
	if (localStorage.getItem('showUserStatusInTray') === 'true') {
		localStorage.setItem('showUserStatusInTray', 'false');
	} else {
		localStorage.setItem('showUserStatusInTray', 'true');
	}

	if (localStorage.getItem('hideTray') !== 'true') {
		showTrayAlert(state.badge, state.status);
	}
}

if (localStorage.getItem('hideTray') !== 'true') {
	createAppTray();
}

export default {
	showTrayAlert,
	toggle,
	toggleStatus,
};
