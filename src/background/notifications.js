import { app, ipcMain, Notification as ElectronNotification } from 'electron';
import { ToastNotification } from 'electron-windows-notifications';
import { EventEmitter } from 'events';
import freedesktopNotifications from 'freedesktop-notifications';
import os from 'os';
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

		const notification = new ElectronNotification({
			title,
			body,
			icon: icon && path.resolve(icon),
		});

		notification.on('show', () => this.emit('show'));
		notification.on('close', () => {
			if (tag) {
				delete MacNotification.instances[tag];
			}

			this.emit('close');
		});
		notification.on('click', () => this.emit('click'));

		app.on('before-quit', () => notification.close());

		if (tag) {
			MacNotification.instances[tag] = notification;
		}

		this.notification = notification;
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

		const notification = (tag && LinuxNotification.instances[tag]) ||
			freedesktopNotifications.createNotification(this.parameters);

		notification.on('close', () => {
			if (tag) {
				delete LinuxNotification.instances[tag];
			}

			this.emit('close');
		});
		notification.on('action', (action) => action === 'default' && this.emit('click'));

		app.on('before-quit', () => notification.close());

		if (tag) {
			LinuxNotification.instances[tag] = notification;
		}

		this.notification = notification;
	}

	show() {
		this.notification.set(this.parameters);
		this.notification.push(() => this.emit('show'));
	}

	close() {
		this.notification.close();
	}
}

class WindowsNotification extends BaseNotification {
	constructor({ title, body, icon, tag } = {}) {
		super();

		const notification = new ToastNotification({
			appId: 'chat.rocket',
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
			tag,
		});

		notification.on('dismissed', () => this.emit('close'));
		notification.on('activated', () => this.emit('click'));

		app.on('before-quit', () => notification.hide());

		this.notification = notification;
	}

	show() {
		this.notification.show();
		this.emit('show');
	}

	close() {
		this.notification.hide();
	}
}

class Windows7Notification extends BaseNotification {
	constructor({ title, body, icon, tag } = {}) {
		super();

		Windows7Notification.instances = Windows7Notification.instances || {};

		this.previousNotification = tag && Windows7Notification.instances[tag];

		const notification = new ElectronNotification({
			title,
			body,
			icon: icon && path.resolve(icon),
		});

		notification.on('show', () => this.emit('show'));
		notification.on('close', () => {
			if (tag) {
				delete Windows7Notification.instances[tag];
			}

			this.emit('close');
		});
		notification.on('click', () => this.emit('click'));

		app.on('before-quit', () => notification.close());

		if (tag) {
			Windows7Notification.instances[tag] = notification;
		}

		this.notification = notification;
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

class Notification extends ({
	darwin: MacNotification,
	linux: LinuxNotification,
	win32: os.release().split('.').slice(0, 2).join('.') === '6.1' ? Windows7Notification : WindowsNotification,
}[os.platform()]) {}

const notifications = [];

ipcMain.on('request-notification', (event, options) => {
	const notification = new Notification(options);
	notifications.push(notification);

	const id = notifications.length - 1;

	notification.on('click', () => event.sender.send('notification-clicked', id));
	notification.on('close', () => event.sender.send('notification-closed', id));

	event.returnValue = id;

	notification.show();
});

ipcMain.on('close-notification', (event, id) => {
	if (notifications[id]) {
		notifications[id].close();
		delete notifications[id];
	}
});
