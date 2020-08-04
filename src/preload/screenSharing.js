import { ipcRenderer } from 'electron';

import {
	SEND_SCREEN_SHARING_SOURCE_REQUESTED,
	SEND_SCREEN_SHARING_SOURCE_SELECTED,
} from '../ipc';

export const setupScreenSharingEvents = () => {
	window.addEventListener('get-sourceId', () => {
		ipcRenderer.send(SEND_SCREEN_SHARING_SOURCE_REQUESTED);
	});

	ipcRenderer.addListener(SEND_SCREEN_SHARING_SOURCE_SELECTED, (_, source) => {
		window.parent.postMessage({ sourceId: source || 'PermissionDeniedError' }, '*');
	});
};
