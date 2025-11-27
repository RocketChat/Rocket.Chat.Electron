import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  verifyPassword: (password: string) =>
    ipcRenderer.invoke('lock:verify', password),
  unlockApp: () => ipcRenderer.invoke('lock:unlock'),
});
