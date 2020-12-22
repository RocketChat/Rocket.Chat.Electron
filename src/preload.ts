import { contextBridge, webFrame } from 'electron';

import { setupRendererErrorHandling } from './errors';
import { invoke } from './ipc/renderer';
import { JitsiMeetElectron, JitsiMeetElectronAPI } from './jitsi/preload';
import { listenToNotificationsRequests } from './notifications/preload';
import { listenToScreenSharingRequests } from './screenSharing/preload';
import { RocketChatDesktop, RocketChatDesktopAPI, serverInfo } from './servers/preload/api';
import { setServerUrl } from './servers/preload/urls';
import { createRendererReduxStore } from './store';
import { listenToMessageBoxEvents } from './ui/preload/messageBox';
import { handleTrafficLightsSpacing } from './ui/preload/sidebar';
import { listenToUserPresenceChanges } from './userPresence/preload';
import { whenReady } from './whenReady';

declare global {
  interface Window {
    JitsiMeetElectron: JitsiMeetElectronAPI;
    RocketChatDesktop: RocketChatDesktopAPI;
  }
}

contextBridge.exposeInMainWorld('JitsiMeetElectron', JitsiMeetElectron);
contextBridge.exposeInMainWorld('RocketChatDesktop', RocketChatDesktop);

const start = async (): Promise<void> => {
  const { serverUrl, injectableCode } = await invoke('server-view/get-initialization-data');

  setServerUrl(serverUrl);

  await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('webviewPreload');

  await webFrame.executeJavaScript(injectableCode);

  if (!serverInfo) {
    return;
  }

  listenToNotificationsRequests();
  listenToScreenSharingRequests();
  listenToUserPresenceChanges();
  listenToMessageBoxEvents();
  handleTrafficLightsSpacing();
};

start();
