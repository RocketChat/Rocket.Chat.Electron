import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';
import {
	SEND_NOTIFICATION_SHOWN,
	SEND_NOTIFICATION_CLOSED,
	SEND_NOTIFICATION_CLICKED,
	SEND_FOCUS_REQUESTED,
	SEND_NOTIFICATION_REPLIED,
	SEND_NOTIFICATION_ACTIONED,
	SEND_NOTIFICATION_CREATE,
	SEND_NOTIFICATION_SHOW,
	SEND_NOTIFICATION_CLOSE,
} from '../../ipc';

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

		ipcRenderer.invoke(SEND_NOTIFICATION_CREATE, {
			title,
			icon: normalizeIconUrl(icon),
			...options,
		}).then((id) => {
			this.id = id;
			notifications.set(this.id, this);
			return ipcRenderer.invoke(SEND_NOTIFICATION_SHOW, this.id);
		});
	}

	close() {
		if (!this.id) {
			return;
		}

		ipcRenderer.invoke(SEND_NOTIFICATION_CLOSE, this.id);
		notifications.delete(this.id);
		this.id = null;
	}
}

export const setupNotifications = () => {
	window.Notification = Notification;

	ipcRenderer.addListener(SEND_NOTIFICATION_SHOWN, (event, id) => {
		const notification = notifications.get(id);
		const showEvent = new CustomEvent('show');
		notification?.dispatchEvent(showEvent);
	});

	ipcRenderer.addListener(SEND_NOTIFICATION_CLOSED, (event, id) => {
		const notification = notifications.get(id);
		const closeEvent = new CustomEvent('close');
		notification?.dispatchEvent(closeEvent);
	});

	ipcRenderer.addListener(SEND_NOTIFICATION_CLICKED, (event, id) => {
		const notification = notifications.get(id);
		const clickEvent = new CustomEvent('click');
		notification?.dispatchEvent(clickEvent);

		const payload = {
			url: getServerUrl(),
		};
		ipcRenderer.send(SEND_FOCUS_REQUESTED, payload);
	});

	ipcRenderer.addListener(SEND_NOTIFICATION_REPLIED, (event, id, response) => {
		const notification = notifications.get(id);
		const replyEvent = new CustomEvent('reply', { detail: { response } });
		replyEvent.response = response;
		notification?.dispatchEvent(replyEvent);
	});

	ipcRenderer.addListener(SEND_NOTIFICATION_ACTIONED, (event, id, index) => {
		const notification = notifications.get(id);
		const actionEvent = new CustomEvent('action', { detail: { index } });
		actionEvent.index = index;
		notification?.dispatchEvent(actionEvent);
	});
};
