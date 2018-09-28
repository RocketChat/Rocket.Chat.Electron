import { remote } from 'electron';
import { EventEmitter } from 'events';
import path from 'path';
import i18n from '../i18n/index.js';

const { Tray, Menu, app, getCurrentWindow, systemPreferences } = remote;

let trayIcon = null;

const getTrayIconFileNameSuffix = ({ badge: { title, count, showAlert } }) => {
	if (title === '•') {
		return 'dot';
	} else if (count > 9) {
		return '9plus';
	} else if (count > 0) {
		return String(count);
	} else if (showAlert) {
		return 'alert';
	} else {
		return 'Template';
	}
};

const getTrayIconPath = (state) => {
	const iconDir = {
		win32: 'windows',
		linux: 'linux',
		darwin: 'osx',
	}[process.platform];
	const fileName = `icon-tray-${ getTrayIconFileNameSuffix(state) }.${ process.platform === 'win32' ? 'ico' : 'png' }`;
	return path.join(__dirname, 'images', iconDir, fileName);
};

const getTrayIconTitle = ({ badge: { title, count, showAlert }, status }) => {
	// TODO: remove status icon from title, since ANSI codes disable title color's adaptiveness
	const isDarkMode = systemPreferences.getUserDefault('AppleInterfaceStyle', 'string') === 'Dark';

	const statusAnsiColor = {
		online: '32',
		away: '33',
		busy: '31',
		offline: isDarkMode ? '37' : '0',
	}[status];

	const badgeTitleAnsiColor = isDarkMode ? '37' : '0';

	const statusBulletString = status ? `\u001B[${ statusAnsiColor }m•\u001B[0m` : null;
	const badgeTitleString = (showAlert && count > 0) ? `\u001B[${ badgeTitleAnsiColor }m${ title }\u001B[0m` : null;

	return [statusBulletString, badgeTitleString].filter(Boolean).join(' ');
};

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

const mainWindow = getCurrentWindow();

function createAppTray() {
	trayIcon = new Tray(getTrayIconPath({ badge: { title:'', count:0, showAlert:false } }));
	trayIcon.setToolTip(app.getName());

	const events = new EventEmitter();

	const updateContextMenu = () => {
		const state = {
			isHidden: !mainWindow.isMinimized() && !mainWindow.isVisible(),
		};
		const template = createContextMenuTemplate(state, events);
		const menu = Menu.buildFromTemplate(template);
		trayIcon.setContextMenu(menu);
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

	trayIcon.on('right-click', function(event, bounds) {
		trayIcon.popUpContextMenu(undefined, bounds);
	});

	trayIcon.on('click', () => {
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
		trayIcon.destroy();
		mainWindow.emit('tray-destroyed');
	};

	mainWindow.emit('tray-created');
}

let state = {
	badge: {
		title: '',
		count: 0,
		showAlert: false,
	},
	status: 'online',
};

function showTrayAlert(badge, status = 'online') {
	if (trayIcon === null || trayIcon === undefined) {
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
		app.dock.setBadge(badge.title);
		if (trayDisplayed) {
			trayIcon.setTitle(getTrayIconTitle({ badge, status: statusDisplayed && status }));
		}
	}

	if (process.platform === 'linux') {
		app.setBadgeCount(badge.count);
	}

	if (trayDisplayed) {
		trayIcon.setImage(getTrayIconPath({ badge }));
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
