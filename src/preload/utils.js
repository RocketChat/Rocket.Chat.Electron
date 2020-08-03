import { ipcRenderer } from 'electron';

export const whenReady = () => new Promise((resolve) => {
	if (document.readyState !== 'loading') {
		resolve();
		return;
	}

	const handleReadyStateChange = () => {
		if (document.readyState === 'loading') {
			return;
		}

		document.removeEventListener('readystatechange', handleReadyStateChange);
		resolve();
	};

	document.addEventListener('readystatechange', handleReadyStateChange);
});

export const getWebContentsId = async () => ipcRenderer.invoke('get-webcontents-id');
