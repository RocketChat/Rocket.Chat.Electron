import { ipcRenderer } from 'electron';

import { QUERY_SCREEN_SHARING_SOURCE } from '../ipc';

const handleGetSourceIdEvent = async () => {
	try {
		const sourceId = await ipcRenderer.invoke(QUERY_SCREEN_SHARING_SOURCE);
		window.top.postMessage({ sourceId }, '*');
	} catch (error) {
		window.top.postMessage({ sourceId: 'PermissionDeniedError' }, '*');
	}
};

export const setupScreenSharing = async () => {
	window.addEventListener('get-sourceId', handleGetSourceIdEvent);
};
