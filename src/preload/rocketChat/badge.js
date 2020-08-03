import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';

export const setupBadgeChanges = () => {
	window.addEventListener('unread-changed', (event) => {
		const payload = {
			url: getServerUrl(),
			badge: event.detail,
		};
		ipcRenderer.send('unread-changed', payload);
	});
};
