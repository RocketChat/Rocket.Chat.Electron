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

console.log('[Rocket.Chat Desktop] Preload.ts');

const startWithServerInfo = async (): Promise<void> => {
  if (!serverInfo) {
    console.log('[Rocket.Chat Desktop] serverInfo is not defined');
    console.log("Breaking here because it's not possible to continue");
    console.log('Retry in 1 seconds');
    setTimeout(startWithServerInfo, 1000);
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

const start = async (): Promise<void> => {
  const serverUrl = await invoke('server-view/get-url');

  if (!serverUrl) {
    console.log('[Rocket.Chat Desktop] serverUrl is not defined');
    console.log('[Rocket.Chat Desktop] Preload start - retrying in 1 seconds');
    setTimeout(start, 1000);
    return;
  }

  console.log('[Rocket.Chat Desktop] serverUrl:', serverUrl);

  contextBridge.exposeInMainWorld('RocketChatDesktop', RocketChatDesktop);
  contextBridge.exposeInMainWorld('JitsiMeetElectron', JitsiMeetElectron);

  setServerUrl(serverUrl);

  await whenReady();

  await createRendererReduxStore();

  await invoke('server-view/ready');

  startWithServerInfo();
};

start();
