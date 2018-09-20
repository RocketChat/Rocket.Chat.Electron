'use strict';

import { remote } from 'electron';
import path from 'path';
import i18n from '../i18n/index.js';

const { Tray, Menu } = remote;

const mainWindow = remote.getCurrentWindow();

const icons = {
	win32: {
		dir: 'windows',
	},
	linux: {
		dir: 'linux',
	},
	darwin: {
		dir: 'osx',
	},
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

	return path.join(__dirname, 'images', icons[process.platform].dir, iconFilename);
}

function createAppTray() {
	const _tray = new Tray(getTrayImagePath({ title:'', count:0, showAlert:false }));
	mainWindow.tray = _tray;

	const contextMenuShow = Menu.buildFromTemplate([{
		label: i18n.__('Show'),
		click() {
			mainWindow.show();
		},
	}, {
		label: i18n.__('Quit'),
		click() {
			remote.app.quit();
		},
	}]);

	const contextMenuHide = Menu.buildFromTemplate([{
		label: i18n.__('Hide'),
		click() {
			mainWindow.hide();
		},
	}, {
		label: i18n.__('Quit'),
		click() {
			remote.app.quit();
		},
	}]);

	if (!mainWindow.isMinimized() && !mainWindow.isVisible()) {
		_tray.setContextMenu(contextMenuShow);
	} else {
		_tray.setContextMenu(contextMenuHide);
	}

	const onShow = function() {
		_tray.setContextMenu(contextMenuHide);
	};

	const onHide = function() {
		_tray.setContextMenu(contextMenuShow);
	};

	mainWindow.on('show', onShow);
	mainWindow.on('restore', onShow);

	mainWindow.on('hide', onHide);
	mainWindow.on('minimize', onHide);

	_tray.setToolTip(remote.app.getName());

	_tray.on('right-click', function(e, b) {
		_tray.popUpContextMenu(undefined, b);
	});

	_tray.on('click', () => {
		if (mainWindow.isVisible()) {
			return mainWindow.hide();
		}

		mainWindow.show();
	});

	mainWindow.destroyTray = function() {
		mainWindow.removeListener('show', onShow);
		mainWindow.removeListener('hide', onHide);
		_tray.destroy();
	};
}

function showTrayAlert(badge, status = 'online') {
	if (mainWindow.tray === null || mainWindow.tray === undefined) {
		return;
	}

	const trayDisplayed = localStorage.getItem('hideTray') !== 'true';
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
		if (remote.systemPreferences.isDarkMode()) {
			countColor = messageCountColor.white;
		}

		let trayTitle = `${ statusBullet[status] }`;
		if (hasMentions) {
			trayTitle = `${ statusBullet[status] } ${ countColor }${ badge.title }`;
		}
		remote.app.dock.setBadge(badge.title);
		if (trayDisplayed) {
			mainWindow.tray.setTitle(trayTitle);
		}
	}

	if (process.platform === 'linux') {
		remote.app.setBadgeCount(badge.count);
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
	} else {
		removeAppTray();
		localStorage.setItem('hideTray', 'true');
	}
}

if (localStorage.getItem('hideTray') !== 'true') {
	createAppTray();
}

export default {
	showTrayAlert,
	toggle,
};
