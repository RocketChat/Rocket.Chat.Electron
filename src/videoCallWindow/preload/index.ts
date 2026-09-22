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

// Methods for the page loaded in the video call window's webview. They live
// under RocketChatDesktop so the web app has a single bridge to look for, and
// under `videoCall` because this window's surface is not the main window's:
// the webview loads whatever URL the workspace's provider points at (Jitsi,
// Pexip, the conference page), so nothing here may expose workspace state.
const videoCall = {
  // Navigate the main app window to an in-app route and bring it to the front.
  // `path` is a server-relative route, e.g. "/channel/general".
  openInMainWindow: (path: string) => {
    if (isRelativeRoute(path)) {
      ipcRenderer
        .invoke('video-call-window/open-in-main-window', path)
        .catch((error) =>
          console.warn('Video call window: open-in-main-window failed:', error)
        );
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
};

// Deliberately not declared on the global `Window`: the server webview's
// preload already declares RocketChatDesktop with its own (much larger) shape,
// and the two declarations would merge project-wide even though no context
// ever sees both bridges.
contextBridge.exposeInMainWorld('RocketChatDesktop', { videoCall });
