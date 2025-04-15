import { contextBridge, ipcRenderer } from 'electron';
import './jitsiBridge';

// Expose any necessary APIs to the webview content
contextBridge.exposeInMainWorld('videoCallWindow', {
  // Add methods here if needed for communication with the main process
  requestScreenSharing: async () => {
    // Directly invoke the screen picker
    await ipcRenderer.invoke('video-call-window/open-screen-picker');
    return new Promise<string | null>((resolve) => {
      ipcRenderer.once(
        'video-call-window/screen-sharing-source-responded',
        (_event, id) => {
          resolve(id);
        }
      );
    });
  },
});
