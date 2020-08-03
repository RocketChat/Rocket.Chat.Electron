import { ipcRenderer } from 'electron';

export const setupScreenSharingEvents = () => {
	window.addEventListener('get-sourceId', () => {
		ipcRenderer.send('screen-sharing-source-requested');
	});

	ipcRenderer.addListener('screen-sharing-source-selected', (_, source) => {
		window.parent.postMessage({ sourceId: source || 'PermissionDeniedError' }, '*');
	});
};
