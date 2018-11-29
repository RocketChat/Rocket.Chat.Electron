import { app, ipcMain, Notification } from 'electron';
import freedesktopNotifications from 'freedesktop-notifications';
import os from 'os';
import path from 'path';


class BaseNotification {
	constructor(options = {}) {
		this.handleShow = this.handleShow.bind(this);
		this.handleClick = this.handleClick.bind(this);
		this.handleClose = this.handleClose.bind(this);
		this.initialize(options);
	}

	handleShow() {
		const { id, eventTarget } = this;
		eventTarget && !eventTarget.isDestroyed() && eventTarget.send('notification-shown', id);
	}

	handleClick() {
		const { id, eventTarget } = this;
		eventTarget && !eventTarget.isDestroyed() && eventTarget.send('notification-clicked', id);
	}

	handleClose() {
		const { id, eventTarget } = this;
		eventTarget && !eventTarget.isDestroyed() && eventTarget.send('notification-closed', id);
	}

	initialize(/* options = {} */) {}
	reset(/* options = {} */) {}
	show() {}
	close() {}
}


class ElectronNotification extends BaseNotification {
	initialize({ title, body, icon, silent } = {}) {
		this.notification = new Notification({
			title,
			body,
			icon: icon && path.resolve(icon),
			silent,
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


class FreeDesktopNotification extends BaseNotification {
	escapeBody(body) {
		const escapeMap = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			'\'': '&#x27;',
			'`': '&#x60;',
		};

		const escapeRegex = new RegExp(`(?:${ Object.keys(escapeMap).join('|') })`, 'g');

		return body.replace(escapeRegex, (match) => escapeMap[match]);
	}

	initialize({ title, body, icon, silent } = {}) {
		this.notification = freedesktopNotifications.createNotification({
			summary: title,
			body: body && this.escapeBody(body),
			icon: icon ? path.resolve(icon) : 'info',
			appName: app.getName(),
			timeout: 24 * 60 * 60 * 1000,
			sound: silent ? undefined : 'message-new-instant',
			actions: process.env.XDG_CURRENT_DESKTOP !== 'Unity' ? {
				default: '',
			} : null,
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
		event.returnValue = notification.id;
		setImmediate(() => notification.show());
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
