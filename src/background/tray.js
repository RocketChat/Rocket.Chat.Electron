import { nativeImage, systemPreferences, Menu, Tray as TrayIcon } from 'electron';
import { EventEmitter } from 'events';
import i18n from '../i18n/index.js';


const getTrayIconStyle = ({ badge: { title, count, showAlert }, status }) => {
	const style = {};

	if (title === '•') {
		style.badgeText = '•';
	} else if (count > 0) {
		style.badgeText = count > 9 ? '9+' : String(count);
	} else if (showAlert) {
		style.badgeText = '!';
	}

	style.statusColor = {
		away: 'yellow',
		busy: 'red',
		online: 'lime',
	}[status];

	style.colored = process.platform !== 'darwin' || !style.badgeText || !style.statusColor;

	style.size = process.platform === 'win32' ? 16 : 24;

	return style;
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

const getTrayIconTooltip = ({ badge: { count } }) => i18n.pluralize('Message_count', count, count);

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
	}

	setState(partialState) {
		this.state = {
			...this.state,
			...partialState,
		};
		this.update();
	}

	createTrayIcon(image) {
		if (this.trayIcon) {
			return;
		}

		this.trayIcon = new TrayIcon(image);

		this.trayIcon.on('click', () => this.emit('set-main-window-visibility', !this.state.isMainWindowVisible));
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

	async update() {
		if (!this.state.showIcon) {
			this.destroyTrayIcon();
			this.emit('update');
			return;
		}

		let image;
		const waitForIcon = new Promise((resolve) => this.once('rendered-icon', resolve));
		if (process.platform === 'darwin') {
			this.emit('render-icon', { colored: false });
		} else {
			this.emit('render-icon', getTrayIconStyle(this.state));
		}
		const { dataUrl, pixelRatio } = await waitForIcon;
		const pngData = nativeImage.createFromDataURL(dataUrl).toPNG();
		image = nativeImage.createFromBuffer(pngData, pixelRatio);
		if (process.platform === 'darwin') {
			image.setTemplateImage(true);
		}

		if (!this.trayIcon) {
			this.createTrayIcon(image);
		} else {
			this.trayIcon.setImage(image);
		}

		this.trayIcon.setToolTip(getTrayIconTooltip(this.state));

		if (process.platform === 'darwin') {
			this.trayIcon.setTitle(getTrayIconTitle(this.state));
		}

		const template = createContextMenuTemplate(this.state, this);
		const menu = Menu.buildFromTemplate(template);
		this.trayIcon.setContextMenu(menu);
		this.emit('update');
	}
}

export default new Tray();
