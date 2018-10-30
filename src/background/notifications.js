import freedesktopNotifications from 'freedesktop-notifications';
import { EventEmitter } from 'events';


class FreedesktopNotification extends EventEmitter {
	constructor(title, { body, icon, tag } = {}) {
		super();

		this.tag = tag;

		this.instance = freedesktopNotifications.createNotification({
			summary: title,
			body,
			icon,
		});

		// this.instance.on('action', (...args) => console.log(args));
		this.instance.on('close', (closedBy) => {
			if (closedBy === 'user') {
				this.emit('click');
			}

			this.emit('close');
		});

		this.instance.push(() => this.emit('show'));
	}

	close() {
		this.instance.close();
	}
}

export class Notification extends ({
	linux: FreedesktopNotification,
}[process.platform]) {}
