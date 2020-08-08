import { takeEvery } from 'redux-saga/effects';

import { getServerUrl } from '.';
import {
	WEBVIEW_FOCUS_REQUESTED,
	NOTIFICATIONS_CREATE_REQUESTED,

	NOTIFICATIONS_NOTIFICATION_ACTIONED,
	NOTIFICATIONS_NOTIFICATION_CLICKED,
	NOTIFICATIONS_NOTIFICATION_CLOSED,
	NOTIFICATIONS_NOTIFICATION_DISMISSED,
	NOTIFICATIONS_NOTIFICATION_REPLIED,
	NOTIFICATIONS_NOTIFICATION_SHOWN,
} from '../../actions';
import { dispatch, request } from '../../channels';


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

	constructor(title, { icon, ...options } = {}) {
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

		this._destroy = request(NOTIFICATIONS_CREATE_REQUESTED, {
			title,
			icon: normalizeIconUrl(icon),
			...options,
		}).then((id) => {
			notifications.set(id, this);

			return () => {
				dispatch({ type: NOTIFICATIONS_NOTIFICATION_DISMISSED, payload: { id } });
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
};

export function *takeNotificationsActions() {
	yield takeEvery(NOTIFICATIONS_NOTIFICATION_SHOWN, function *(action) {
		const { payload: { id } } = action;

		if (!notifications.has(id)) {
			return;
		}

		const showEvent = new CustomEvent('show');
		notifications.get(id).dispatchEvent(showEvent);
	});

	yield takeEvery(NOTIFICATIONS_NOTIFICATION_CLOSED, function *(action) {
		const { payload: { id } } = action;

		if (!notifications.has(id)) {
			return;
		}

		const closeEvent = new CustomEvent('close');
		notifications.get(id).dispatchEvent(closeEvent);
		notifications.delete(id);
	});

	yield takeEvery(NOTIFICATIONS_NOTIFICATION_CLICKED, function *(action) {
		const { payload: { id } } = action;

		if (!notifications.has(id)) {
			return;
		}

		dispatch({
			type: WEBVIEW_FOCUS_REQUESTED,
			payload: {
				url: getServerUrl(),
			},
		});

		const clickEvent = new CustomEvent('click');
		notifications.get(id).dispatchEvent(clickEvent);
	});

	yield takeEvery(NOTIFICATIONS_NOTIFICATION_REPLIED, function *(action) {
		const { payload: { id, reply } } = action;

		if (!notifications.has(id)) {
			return;
		}

		const replyEvent = new CustomEvent('reply', { detail: { reply } });
		replyEvent.reply = reply;
		notifications.get(id).dispatchEvent(replyEvent);
	});

	yield takeEvery(NOTIFICATIONS_NOTIFICATION_ACTIONED, function *(action) {
		const { payload: { id, index } } = action;

		if (!notifications.has(id)) {
			return;
		}

		const actionEvent = new CustomEvent('action', { detail: { index } });
		actionEvent.index = index;
		notifications.get(id).dispatchEvent(actionEvent);
	});
}
