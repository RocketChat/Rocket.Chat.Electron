import { Menu, Tray as TrayIcon } from 'electron';
import { EventEmitter } from 'events';
import icon from './icon';
import i18n from '../i18n/index.js';


const getIconStyle = ({ badge: { title, count }, status, showUserStatus }) => {
	const style = {
		template: process.platform === 'darwin',
		size: {
			darwin: 24,
			win32: [32, 24, 16],
			linux: 22,
		}[process.platform],
	};

	if (showUserStatus) {
		style.status = status;
	}

	if (process.platform !== 'darwin') {
		if (title === '•') {
			style.badgeText = '•';
		} else if (count > 0) {
			style.badgeText = count > 9 ? '9+' : String(count);
		} else if (title) {
			style.badgeText = '!';
		}
	}

	return style;
};

const getIconTitle = ({ badge: { title, count } }) => ((count > 0) ? title : '');

const getIconTooltip = ({ badge: { count } }) => i18n.pluralize('Message_count', count, count);

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
	status: 'online',
	isMainWindowVisible: true,
	showIcon: true,
	showUserStatus: true,
};

const instance = new (class Tray extends EventEmitter {});

const createIcon = (image) => {
	if (trayIcon) {
		return;
	}

	trayIcon = new TrayIcon(image);

	trayIcon.on('click', () => instance.emit('set-main-window-visibility', !state.isMainWindowVisible));
	trayIcon.on('right-click', (event, bounds) => trayIcon.popUpContextMenu(undefined, bounds));

	instance.emit('created');
};

const destroyIcon = () => {
	if (!trayIcon) {
		return;
	}

	trayIcon.destroy();
	instance.emit('destroyed');
	trayIcon = null;
};

const destroy = () => {
	destroyIcon();
	instance.removeAllListeners();
};

const update = async() => {
	if (!state.showIcon) {
		destroyIcon();
		instance.emit('update');
		return;
	}

	const image = await icon.render(getIconStyle(state));

	if (!trayIcon) {
		createIcon(image);
	} else {
		trayIcon.setImage(image);
	}

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
