import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';

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
		return Promise.resolve(Notification.permission);
	}

	constructor(title, { icon, ...options }) {
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

export const setupNotifications = () => {
	window.Notification = Notification;

	ipcRenderer.on('notification/shown', (event, id) => {
		const notification = notifications.get(id);
		const showEvent = new CustomEvent('show');
		notification?.dispatchEvent(showEvent);
	});

	ipcRenderer.on('notification/closed', (event, id) => {
		const notification = notifications.get(id);
		const closeEvent = new CustomEvent('close');
		notification?.dispatchEvent(closeEvent);
	});

	ipcRenderer.on('notification/clicked', (event, id) => {
		const notification = notifications.get(id);
		const clickEvent = new CustomEvent('click');
		notification?.dispatchEvent(clickEvent);

		const payload = {
			url: getServerUrl(),
		};
		ipcRenderer.send('focus-requested', payload);
	});

	ipcRenderer.on('notification/replied', (event, id, response) => {
		const notification = notifications.get(id);
		const replyEvent = new CustomEvent('reply', { detail: { response } });
		replyEvent.response = response;
		notification?.dispatchEvent(replyEvent);
	});

	ipcRenderer.on('notification/actioned', (event, id, index) => {
		const notification = notifications.get(id);
		const actionEvent = new CustomEvent('action', { detail: { index } });
		actionEvent.index = index;
		notification?.dispatchEvent(actionEvent);
	});
};
