import { Menu, Tray as TrayIcon } from 'electron';
import { EventEmitter } from 'events';
import icon from './icon';
import i18n from '../i18n/index.js';


const getTrayIconStyle = ({ badge: { title, count, showAlert }, status, showUserStatus }) => {
	const style = {
		template: process.platform === 'darwin',
		size: process.platform === 'win32' ? 16 : 24,
	};

	if (showUserStatus) {
		style.status = status;
	}

	if (process.platform !== 'darwin') {
		if (title === '•') {
			style.badgeText = '•';
		} else if (count > 0) {
			style.badgeText = count > 9 ? '9+' : String(count);
		} else if (showAlert) {
			style.badgeText = '!';
		}
	}

	return style;
};

const getTrayIconTitle =
	({ badge: { title, count, showAlert } }) => ((showAlert && count > 0) ? title : null);

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

		const image = await icon.render(getTrayIconStyle(this.state));

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
