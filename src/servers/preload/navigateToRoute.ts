import { ipcRenderer } from 'electron';

let navigateCallback: ((path: string) => void) | null = null;
let pendingPath: string | null = null;

// Registered by the web client to receive in-app route changes requested by the
// desktop shell (e.g. from the standalone video call window). `path` is a
// server-relative route, e.g. "/channel/general".
export const onNavigateToRoute = (callback: (path: string) => void): void => {
  navigateCallback = callback;
  if (pendingPath) {
    callback(pendingPath);
    pendingPath = null;
  }
};

let listening = false;

// Relays the main-process 'navigate-to-route' event (delivered to this preload's
// ipcRenderer, since the server webview is contextIsolated) to the web client's
// callback. Buffers the latest path if a request arrives before the web client
// has registered its handler.
export const listenToNavigateToRouteRequests = (): void => {
  if (listening) {
    return;
  }
  listening = true;

  ipcRenderer.on('navigate-to-route', (_event, path: string) => {
    if (navigateCallback) {
      navigateCallback(path);
    } else {
      pendingPath = path;
    }
  });
};
