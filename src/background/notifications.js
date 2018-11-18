import { app, ipcMain, Notification } from 'electron';
import { ToastNotification } from 'electron-windows-notifications';
import freedesktopNotifications from 'freedesktop-notifications';
import os from 'os';
import path from 'path';


class BaseNotification {
	constructor(options = {}) {
		this.initialize(options);
	}

	handleShow() {
		const { id, eventTarget } = this;
		eventTarget && eventTarget.send('notification-shown', id);
	}

	handleClick() {
		const { id, eventTarget } = this;
		eventTarget && eventTarget.send('notification-clicked', id);
	}

	handleClose() {
		const { id, eventTarget } = this;
		eventTarget && eventTarget.send('notification-closed', id);
	}

	initialize(/* options = {} */) {}
	reset(/* options = {} */) {}
	show() {}
	close() {}
}


class ElectronNotification extends BaseNotification {
	initialize({ title, body, icon } = {}) {
		this.notification = new Notification({
			title,
			body,
			icon: icon && path.resolve(icon),
		});

		this.notification.on('show', this.handleShow);
		this.notification.on('click', this.handleClick);
		this.notification.on('close', this.handleClose);
	}

	reset(options = {}) {
		this.notification.removeAllListeners();
		this.notification.close();
		this.createNotification(options);
	}

	show() {
		this.notification.show();
	}

	close() {
		this.notification.close();
	}
}


class WindowsToastNotification extends BaseNotification {
	initialize({ title, body, icon, tag } = {}) {
		this.notification = new ToastNotification({
			template: `
			<toast>
			<visual>
			<binding template="ToastGeneric">
			${ title && '<text>%s</text>' }
			${ body && '<text>%s</text>' }
			${ icon && '<image placement="AppLogoOverride" src="%s" />' }
			</binding>
			</visual>
			</toast>`,
			strings: [title, body, icon].filter(Boolean),
			tag: tag ? `${ tag }` : undefined,
			appId: 'chat.rocket',
		});

		this.notification.on('activated', this.handleClick);
		this.notification.on('dismissed', this.handleClose);
	}

	reset(options = {}) {
		this.notification.removeAllListeners();
		this.initialize(options);
	}

	show() {
		this.notification.show();
		this.handleShow();
	}

	close() {
		this.notification.hide();
	}
}


class FreeDesktopNotification extends BaseNotification {
	initialize({ title, body, icon } = {}) {
		this.notification = freedesktopNotifications.createNotification({
			summary: title,
			body,
			icon: icon ? path.resolve(icon) : 'info',
			appName: app.getName(),
			timeout: 24 * 60 * 60 * 1000,
			actions: {
				default: '',
			},
		});

		this.notification.on('action', (action) => action === 'default' && this.handleClick());
		this.notification.on('close', this.handleClose);
	}

	reset({ title, body, icon } = {}) {
		this.notification.set({
			summary: title,
			body,
			icon: icon ? path.resolve(icon) : 'info',
		});
	}

	show() {
		this.notification.push(this.handleShow);
	}

	close() {
		this.notification.close();
	}
}


const ImplementatedNotification = (() => {
	if (os.platform() === 'linux') {
		return FreeDesktopNotification;
	}

	if (os.platform() === 'win32' && os.release().split('.').slice(0, 2).join('.') !== '6.1') {
		return WindowsToastNotification;
	}

	return ElectronNotification;
})();

const instances = new Map();

let creationCount = 1;

const createOrGetNotification = (options = {}) => {
	const tag = options.tag ? JSON.stringify(options.tag) : null;

	if (!tag || !instances.get(tag)) {
		const notification = new ImplementatedNotification(options);
		notification.id = tag || creationCount++;

		instances.set(notification.id, notification);
		return notification;
	}

	const notification = instances.get(tag);
	notification.reset(options);
	return notification;
};


ipcMain.on('request-notification', (event, options) => {
	try {
		const notification = createOrGetNotification(options);
		notification.eventTarget = event.sender;
		notification.show();
		event.returnValue = notification.id;
	} catch (e) {
		console.error(e);
		event.returnValue = -1;
	}
});

ipcMain.on('close-notification', (event, id) => {
	try {
		const notification = instances.get(id);
		if (notification) {
			notification.close();
			instances.delete(id);
		}
	} catch (e) {
		console.error(e);
	}
});


app.on('before-quit', () => {
	instances.forEach((notification) => {
		notification.close();
	});
});
