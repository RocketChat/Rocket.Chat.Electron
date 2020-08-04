import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';
import {
	EVENT_NOTIFICATION_ACTIONED,
	EVENT_NOTIFICATION_CLICKED,
	EVENT_NOTIFICATION_CLOSED,
	EVENT_NOTIFICATION_CLOSING,
	EVENT_NOTIFICATION_REPLIED,
	EVENT_NOTIFICATION_SHOWN,
	EVENT_SERVER_FOCUSED,
	QUERY_NEW_NOTIFICATION,
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
			const propertyName = `on${ eventType }`;
			const propertySymbol = Symbol(propertyName);

			Object.defineProperty(this, propertyName, {
				get: () => this[propertySymbol],
				set: (value) => {
					if (this[propertySymbol]) {
						this.removeEventListener(eventType, this[propertySymbol]);
					}

					this[propertySymbol] = value;

					if (this[propertySymbol]) {
						this.addEventListener(eventType, this[propertySymbol]);
					}
				},
			});
		}

		this._destroy = ipcRenderer.invoke(QUERY_NEW_NOTIFICATION, {
			title,
			icon: normalizeIconUrl(icon),
			...options,
		}).then((id) => {
			notifications.set(id, this);

			return () => {
				ipcRenderer.send(EVENT_NOTIFICATION_CLOSING, id);
				notifications.delete(id);
			};
		});
	}

	close() {
		if (!this._destroy) {
			return;
		}

		this._destroy.then((destroy) => {
			delete this._destroy;
			destroy();
		});
	}
}

export const setupNotifications = () => {
	window.Notification = Notification;

	ipcRenderer.addListener(EVENT_NOTIFICATION_SHOWN, (event, id) => {
		if (!notifications.has(id)) {
			return;
		}

		const showEvent = new CustomEvent('show');
		notifications.get(id).dispatchEvent(showEvent);
	});

	ipcRenderer.addListener(EVENT_NOTIFICATION_CLOSED, (event, id) => {
		if (!notifications.has(id)) {
			return;
		}

		const closeEvent = new CustomEvent('close');
		notifications.get(id).dispatchEvent(closeEvent);
		notifications.delete(id);
	});

	ipcRenderer.addListener(EVENT_NOTIFICATION_CLICKED, (event, id) => {
		if (!notifications.has(id)) {
			return;
		}

		ipcRenderer.send(EVENT_SERVER_FOCUSED, {
			url: getServerUrl(),
		});

		const clickEvent = new CustomEvent('click');
		notifications.get(id).dispatchEvent(clickEvent);
	});

	ipcRenderer.addListener(EVENT_NOTIFICATION_REPLIED, (event, id, response) => {
		if (!notifications.has(id)) {
			return;
		}

		const replyEvent = new CustomEvent('reply', { detail: { response } });
		replyEvent.response = response;
		notifications.get(id).dispatchEvent(replyEvent);
	});

	ipcRenderer.addListener(EVENT_NOTIFICATION_ACTIONED, (event, id, index) => {
		if (!notifications.has(id)) {
			return;
		}

		const actionEvent = new CustomEvent('action', { detail: { index } });
		actionEvent.index = index;
		notifications.get(id).dispatchEvent(actionEvent);
	});
};
