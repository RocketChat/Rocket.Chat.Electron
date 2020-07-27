import { ipcRenderer } from 'electron';

const normalizeIconUrl = (iconUrl) => {
	if (/^data:/.test(iconUrl)) {
		return iconUrl;
	}

	if (!/^https?:\/\//.test(iconUrl)) {
		const { Meteor } = window.require('meteor/meteor');
		return Meteor.absoluteUrl(iconUrl);
	}

	return iconUrl;
};

const notifications = new Map();

class Notification extends EventTarget {
	static get permission() {
		return 'granted';
	}

	static requestPermission() {
		return Promise.resolve(Notification.permissionx);
	}

	constructor(title, { icon, canReply, ...options }) {
		super();

		for (const eventType of ['show', 'close', 'click', 'reply', 'action']) {
			Object.defineProperty(this, `on${ eventType }`, {
				get: () => this[`_on${ eventType }`],
				set: (value) => {
					if (this[`_on${ eventType }`]) {
						this.removeEventListener(eventType, this[`_on${ eventType }`]);
					}

					this[`_on${ eventType }`] = value;

					if (this[`_on${ eventType }`]) {
						this.addEventListener(eventType, this[`_on${ eventType }`]);
					}
				},
			});
		}

		ipcRenderer.invoke('notification/create', {
			title,
			icon: normalizeIconUrl(icon),
			hasReply: canReply,
			...options,
		}).then((id) => {
			this.id = id;
			notifications.set(this.id, this);
			return ipcRenderer.invoke('notification/show', this.id);
		});
	}

	close() {
		if (!this.id) {
			return;
		}

		ipcRenderer.invoke('notification/close', this.id);
		notifications.delete(this.id);
		this.id = null;
	}
}

ipcRenderer.on('notification/shown', (event, id) => {
	const notification = notifications.get(id);
	notification?.dispatchEvent(new CustomEvent('show'));
});

ipcRenderer.on('notification/closed', (event, id) => {
	const notification = notifications.get(id);
	notification?.dispatchEvent(new CustomEvent('close'));
});

ipcRenderer.on('notification/clicked', (event, id) => {
	const notification = notifications.get(id);
	notification?.dispatchEvent(new CustomEvent('click'));
});

ipcRenderer.on('notification/replied', (event, id, response) => {
	const notification = notifications.get(id);
	notification?.dispatchEvent(new CustomEvent('reply', { response }));
});

ipcRenderer.on('notification/actioned', (event, id, index) => {
	const notification = notifications.get(id);
	notification?.dispatchEvent(new CustomEvent('action', { index }));
});

export const setupNotifications = () => {
	window.Notification = Notification;
};
