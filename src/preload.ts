import { contextBridge, webFrame } from 'electron';

import { invoke } from './ipc/renderer';
import { JitsiMeetElectron, JitsiMeetElectronAPI } from './jitsi/preload';
import { listenToNotificationsRequests } from './notifications/preload';
import { listenToScreenSharingRequests } from './screenSharing/preload';
import {
  RocketChatDesktop,
  RocketChatDesktopAPI,
  serverInfo,
} from './servers/preload/api';
import { setServerUrl } from './servers/preload/urls';
import { createRendererReduxStore, listen } from './store';
import { WEBVIEW_DID_NAVIGATE } from './ui/actions';
import { debounce } from './ui/main/debounce';
import { listenToMessageBoxEvents } from './ui/preload/messageBox';
import { handleTrafficLightsSpacing } from './ui/preload/sidebar';
import { whenReady } from './whenReady';

declare global {
  interface Window {
    JitsiMeetElectron: JitsiMeetElectronAPI;
    RocketChatDesktop: RocketChatDesktopAPI;
  }
}

const start = async (): Promise<void> => {
  const serverUrl = await invoke('server-view/get-url');

  contextBridge.exposeInMainWorld('JitsiMeetElectron', JitsiMeetElectron);

  if (!serverUrl) {
    return;
  }

  contextBridge.exposeInMainWorld('RocketChatDesktop', RocketChatDesktop);

  setServerUrl(serverUrl);

  await createRendererReduxStore();

  await whenReady();

  // This removes the server error handling
  // setupRendererErrorHandling('webviewPreload');

  await invoke('server-view/ready');

  if (!serverInfo) {
    return;
  }

  listen(
    WEBVIEW_DID_NAVIGATE,
    debounce(() => {
      const resources = webFrame.getResourceUsage();
      // TODO: make this configurable
      if (resources.images.size > 50 * 1024 * 1024) {
        webFrame.clearCache();
      }
    }, 1000 * 30)
  );

  listenToNotificationsRequests();
  listenToScreenSharingRequests();
  listenToMessageBoxEvents();
  handleTrafficLightsSpacing();
};

start();
