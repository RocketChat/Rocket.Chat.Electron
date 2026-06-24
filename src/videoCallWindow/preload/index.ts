import { contextBridge, ipcRenderer } from 'electron';
import './jitsiBridge';

// Accept only in-app relative routes ("/..."), rejecting absolute URLs,
// protocol-relative URLs ("//host") and the backslash variant ("/\\host") so
// this can't become an open-redirect / arbitrary-navigation primitive.
const isRelativeRoute = (path: unknown): path is string =>
  typeof path === 'string' &&
  path.startsWith('/') &&
  !path.startsWith('//') &&
  !path.startsWith('/\\');

// Expose any necessary APIs to the webview content
contextBridge.exposeInMainWorld('videoCallWindow', {
  // Navigate the main app window to an in-app route and bring it to the front.
  // `path` is a server-relative route, e.g. "/channel/general".
  openInMainWindow: (path: string) => {
    if (isRelativeRoute(path)) {
      ipcRenderer.invoke('video-call-window/open-in-main-window', path);
      return;
    }
    console.warn(
      'Video call window: openInMainWindow rejected non-relative path:',
      path
    );
  },
  // Close the video call window. The renderer can't close a window the main
  // process created, so the main process does it.
  close: () => ipcRenderer.send('video-call-window/close'),
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
  getAuthCredentials: async (): Promise<{
    userId: string;
    authToken: string;
    serverUrl: string;
  } | null> => {
    return ipcRenderer.invoke('video-call-window/get-credentials');
  },
});
