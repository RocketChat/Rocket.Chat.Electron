import { ipcRenderer } from 'electron';

export default () => {
	document.addEventListener('dragover', (event) => event.preventDefault());
	document.addEventListener('drop', (event) => event.preventDefault());

	const eventsListened = ['unread-changed', 'get-sourceId', 'user-status-manually-set'];

	for (const eventName of eventsListened) {
		window.addEventListener(eventName, (event) => ipcRenderer.sendToHost(eventName, event.detail));
	}
};
