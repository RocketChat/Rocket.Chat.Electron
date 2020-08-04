import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';
import { SEND_BADGE_CHANGED } from '../../ipc';

export const setupBadgeChanges = () => {
	window.addEventListener('unread-changed', (event) => {
		const payload = {
			url: getServerUrl(),
			badge: event.detail,
		};
		ipcRenderer.send(SEND_BADGE_CHANGED, payload);
	});
};
