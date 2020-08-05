import { ipcMain, Notification, webContents, nativeImage } from 'electron';
import fetch from 'node-fetch';

import {
	EVENT_NOTIFICATION_SHOWN,
	EVENT_NOTIFICATION_CLOSED,
	EVENT_NOTIFICATION_CLICKED,
	EVENT_NOTIFICATION_REPLIED,
	EVENT_NOTIFICATION_ACTIONED,
	QUERY_NEW_NOTIFICATION,
	EVENT_NOTIFICATION_CLOSING,
} from '../../ipc';

const iconCache = new Map();

const inferContentTypeFromImageData = (data) => {
	const header = data.slice(0, 3).map((byte) => byte.toString(16)).join('');
	switch (header) {
		case '89504e':
			return 'image/png';
		case '474946':
			return 'image/gif';
		case 'ffd8ff':
			return 'image/jpeg';
	}
};

const resolveIcon = async (iconUrl) => {
	if (!iconUrl) {
		return null;
	}

	if (/^data:/.test(iconUrl)) {
		return nativeImage.createFromDataURL(iconUrl);
	}

	if (iconCache.has(iconUrl)) {
		return iconCache.get(iconUrl);
	}

	try {
		const response = await fetch(iconUrl);
		const buffer = await response.buffer();
		const base64String = buffer.toString('base64');
		const contentType = inferContentTypeFromImageData(buffer) || response.headers.get('content-type');
		const dataUri = `data:${ contentType };base64,${ base64String }`;
		const image = nativeImage.createFromDataURL(dataUri);
		iconCache.set(iconUrl, image);
		return image;
	} catch (error) {
		console.error(error);
		return null;
	}
};

const notifications = new Map();

const createNotification = async (id, {
	title,
	body,
	icon,
	silent,
	requireInteraction,
	...options
}) => {
	const notification = new Notification({
		title,
		body,
		icon: await resolveIcon(icon),
		silent,
		hasReply: true,
		...options,
	});

	notification.addListener('show', () => {
		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send(EVENT_NOTIFICATION_SHOWN, id);
		});
	});

	notification.addListener('close', () => {
		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send(EVENT_NOTIFICATION_CLOSED, id);
			notifications.delete(id);
		});
	});

	notification.addListener('click', () => {
		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send(EVENT_NOTIFICATION_CLICKED, id);
		});
	});

	notification.addListener('reply', (event, reply) => {
		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send(EVENT_NOTIFICATION_REPLIED, id, reply);
		});
	});

	notification.addListener('action', (event, index) => {
		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send(EVENT_NOTIFICATION_ACTIONED, id, index);
		});
	});

	notifications.set(id, notification);

	notification.show();

	return id;
};

const updateNotification = (id, {
	title,
	body,
	silent,
	renotify,
}) => {
	const notification = notifications.get(id);

	if (title) {
		notification.title = title;
	}

	if (body) {
		notification.body = body;
	}

	if (silent) {
		notification.silent = silent;
	}

	if (renotify) {
		notification.show();
	}
};

const handleCreateEvent = async (event, {
	tag,
	...options
}) => {
	if (tag && notifications.has(tag)) {
		return updateNotification(tag, options);
	}

	const id = tag || Math.random().toString(36).slice(2);
	return createNotification(id, options);
};

const handleCloseEvent = (event, id) => {
	notifications.get(id)?.close();
};

export const setupNotifications = () => {
	ipcMain.handle(QUERY_NEW_NOTIFICATION, handleCreateEvent);
	ipcMain.handle(EVENT_NOTIFICATION_CLOSING, handleCloseEvent);
};
