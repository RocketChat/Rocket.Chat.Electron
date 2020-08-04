import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';
import { EVENT_SERVER_BADGE_CHANGED } from '../../ipc';

const handleUnreadChangedEvent = (event) => {
	ipcRenderer.send(EVENT_SERVER_BADGE_CHANGED, {
		url: getServerUrl(),
		badge: event.detail,
	});
};

export const setupBadgeChanges = () => {
	window.addEventListener('unread-changed', handleUnreadChangedEvent);
};
