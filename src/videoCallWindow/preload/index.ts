import { contextBridge, ipcRenderer } from 'electron';
import './jitsiBridge';

type ScreenSharingSelectionPayload = {
  sourceId: string | null;
  shareAudio?: boolean;
};

// Expose any necessary APIs to the webview content
contextBridge.exposeInMainWorld('videoCallWindow', {
  // Add methods here if needed for communication with the main process
  requestScreenSharing: async () => {
    // Directly invoke the screen picker
    await ipcRenderer.invoke('video-call-window/open-screen-picker');
    return new Promise<string | null>((resolve) => {
      ipcRenderer.once(
        'video-call-window/screen-sharing-source-responded',
        (_event, payload: string | null | ScreenSharingSelectionPayload) => {
          if (typeof payload === 'object' && payload !== null) {
            resolve(payload.sourceId);
            return;
          }
          resolve(payload);
        }
      );
    });
  },
  getAuthCredentials: async (): Promise<{
    userId: string;
    authToken: string;
    serverUrl: string;
  } | null> => {
    return ipcRenderer.invoke('video-call-window/get-credentials');
  },
});
