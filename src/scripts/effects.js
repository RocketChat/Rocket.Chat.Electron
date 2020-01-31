import { remote, ipcRenderer } from 'electron';

export const dispatch = (action) => {
	console.log(action);
	ipcRenderer.send('action-dispatched', action);
};

export const subscribe = (handler) => {
	const listener = (_, action) => handler(action);

	remote.ipcMain.addListener('action-dispatched', listener);

	const unsubscribe = () => {
		remote.ipcMain.removeListener('action-dispatched', listener);
	};

	window.addEventListener('beforeunload', unsubscribe);

	return unsubscribe;
};
