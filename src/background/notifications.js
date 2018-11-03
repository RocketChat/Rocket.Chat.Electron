import { app, Notification as ElectronNotification } from 'electron';
import { EventEmitter } from 'events';
import freedesktopNotifications from 'freedesktop-notifications';
import path from 'path';


class BaseNotification extends EventEmitter {
	show() {}
	close() {}
}

class MacNotification extends BaseNotification {
	constructor({ title, body, icon, tag } = {}) {
		super();

		MacNotification.instances = MacNotification.instances || {};

		this.previousNotification = tag && MacNotification.instances[tag];

		this.notification = new ElectronNotification({
			title,
			body,
			icon: icon && path.resolve(icon),
		});

		this.notification.on('show', () => this.emit('show'));
		this.notification.on('close', () => this.emit('close'));
		this.notification.on('click', () => this.emit('click'));

		if (tag) {
			LinuxNotification.instances[tag] = this.notification;
		}
	}

	show() {
		if (this.previousNotification) {
			this.previousNotification.close();
		}

		this.notification.show();
	}

	close() {
		this.notification.close();
	}
}

class LinuxNotification extends BaseNotification {
	constructor({ title, body, icon, tag } = {}) {
		super();

		LinuxNotification.instances = LinuxNotification.instances || {};

		this.parameters = {
			summary: title,
			body,
			icon: icon ? path.resolve(icon) : 'info',
			appName: app.getName(),
			actions: {
				default: '',
			},
		};

		this.notification = (tag && LinuxNotification.instances[tag]) ||
			freedesktopNotifications.createNotification(this.parameters);

		this.notification.on('close', () => this.emit('close'));
		this.notification.on('action', (action) => action === 'default' && this.emit('click'));

		if (tag) {
			LinuxNotification.instances[tag] = this.notification;
		}
	}

	show() {
		this.notification.set(this.parameters);
		this.notification.push(() => this.emit('show'));
	}

	close() {
		this.notification.close();
	}
}

class WindowsNotification extends BaseNotification {}

export class Notification extends ({
	darwin: MacNotification,
	linux: LinuxNotification,
	win32: WindowsNotification,
}[process.platform]) {}

app.on('ready', () => {
	const n = new Notification({
		title: 'wat',
		icon: `${__dirname}/public/images/icon.png`,
	});
	n.on('click', () => console.log('click'));
	n.show();
	// setTimeout(() => n.close(), 1000);
});