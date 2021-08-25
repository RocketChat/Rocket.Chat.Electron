import { contextBridge } from 'electron';

import { setupRendererErrorHandling } from './errors';
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
import { createRendererReduxStore } from './store';
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

  setupRendererErrorHandling('webviewPreload');

  await invoke('server-view/ready');

  if (!serverInfo) {
    return;
  }

  listenToNotificationsRequests();
  listenToScreenSharingRequests();
  listenToMessageBoxEvents();
  handleTrafficLightsSpacing();
};

start();
