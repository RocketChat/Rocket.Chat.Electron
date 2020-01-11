import { remote, ipcRenderer } from 'electron';

export const handle = (channel, handler) => {
	remote.getGlobal('registerRemoteHandler')(channel, (resolve, reject, ...args) =>
		Promise.resolve().then(() => handler(...args)).then(resolve, reject));
};

export const removeHandler = (channel) => {
	remote.ipcMain.removeHandler(channel);
};

export const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

export const listen = (channel, listener) => {
	remote.ipcMain.addListener(channel, listener);
};

export const removeListener = (channel, listener) => {
	remote.ipcMain.removeListener(channel, listener);
};

export const removeAllListeners = (channel) => {
	remote.ipcMain.removeAllListeners(channel);
};

export const emit = (channel, ...args) => ipcRenderer.send(channel, ...args);
