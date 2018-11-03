import { app } from 'electron';
import { EventEmitter } from 'events';
import freedesktopNotifications from 'freedesktop-notifications';
import path from 'path';


class BaseNotification extends EventEmitter {
	show() {}
	close() {}
}

class FreedesktopNotification extends BaseNotification {
	constructor({ title, body, icon, tag } = {}) {
		super();

		FreedesktopNotification.instance = FreedesktopNotification.instance || {};

		this.parameters = {
			summary: title,
			body,
			icon: icon && path.resolve(icon) : 'info',
			appName: app.getName(),
			actions: {
				default: '',
			},
		};

		this.notification = (tag && FreedesktopNotification.instance[tag]) ||
			freedesktopNotifications.createNotification(this.parameters);

		this.notification.on('close', () => this.emit('close'));
		this.notification.on('action', (action) => action === 'default' && this.emit('click'));

		if (tag) {
			FreedesktopNotification.instance[tag] = this.notification;
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

export class Notification extends ({
	linux: FreedesktopNotification,
}[process.platform]) {}
