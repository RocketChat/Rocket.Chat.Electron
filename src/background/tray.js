import { app, systemPreferences, Menu, Tray as TrayIcon } from 'electron';
import { EventEmitter } from 'events';
import path from 'path';
import i18n from '../i18n/index.js';

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
	return path.join(__dirname, 'public', 'images', iconDir, fileName);
};

const getTrayIconTitle = ({ badge: { title, count, showAlert }, status, showUserStatus }) => {
	// TODO: remove status icon from title, since ANSI codes disable title color's adaptiveness
	const isDarkMode = systemPreferences.getUserDefault('AppleInterfaceStyle', 'string') === 'Dark';

	const statusAnsiColor = {
		online: '32',
		away: '33',
		busy: '31',
		offline: isDarkMode ? '37' : '0',
	}[status];

	const badgeTitleAnsiColor = isDarkMode ? '37' : '0';

	const hasMentions = showAlert && count > 0;
	const statusBulletString = showUserStatus ? `\u001B[${ statusAnsiColor }m•\u001B[0m` : null;
	const badgeTitleString = hasMentions ? `\u001B[${ badgeTitleAnsiColor }m${ title }\u001B[0m` : null;

	return [statusBulletString, badgeTitleString].filter(Boolean).join(' ');
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

class Tray extends EventEmitter {
	constructor() {
		super();

		this.state = {
			badge: {
				title: '',
				count: 0,
				showAlert: false,
			},
			status: 'online',
			isMainWindowVisible: true,
			showIcon: true,
			showUserStatus: true,
		};

		this.trayIcon = null;

		this.on('update', this.update.bind(this));
	}

	setState(partialState) {
		this.state = {
			...this.state,
			...partialState,
		};
		this.emit('update');
	}

	createTrayIcon() {
		this.trayIcon = new TrayIcon(getTrayIconPath(this.state));
		this.trayIcon.setToolTip(app.getName());

		const { isMainWindowVisible } = this.state;
		this.trayIcon.on('click', () => this.emit('set-main-window-visibility', !isMainWindowVisible));
		this.trayIcon.on('right-click', (event, bounds) => this.trayIcon.popUpContextMenu(undefined, bounds));

		this.emit('created');
	}

	destroyTrayIcon() {
		if (!this.trayIcon) {
			return;
		}

		this.trayIcon.destroy();
		this.emit('destroyed');
		this.trayIcon = null;
	}

	destroy() {
		this.destroyTrayIcon();
		this.removeAllListeners();
	}

	update() {
		const { showIcon } = this.state;

		if (this.trayIcon && !showIcon) {
			this.destroyTrayIcon();
		} else if (!this.trayIcon && showIcon) {
			this.createTrayIcon();
		}

		if (!this.trayIcon) {
			return;
		}

		if (process.platform === 'darwin') {
			this.trayIcon.setTitle(getTrayIconTitle(this.state));
		}

		this.trayIcon.setImage(getTrayIconPath(this.state));

		const template = createContextMenuTemplate(this.state, this);
		const menu = Menu.buildFromTemplate(template);
		this.trayIcon.setContextMenu(menu);
	}
}

export default new Tray();
