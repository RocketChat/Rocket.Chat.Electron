import { contextBridge } from 'electron';

import { setReduxStore } from './common/store';
import type { JitsiMeetElectronAPI } from './common/types/JitsiMeetElectronAPI';
import type { RocketChatDesktopAPI } from './common/types/RocketChatDesktopAPI';
import { invoke } from './ipc/renderer';
import { JitsiMeetElectron } from './preloadScript/JitsiMeetElectron';
import {
  RocketChatDesktop,
  serverInfo,
} from './preloadScript/RocketChatDesktop';
import { handleTrafficLightsSpacing } from './preloadScript/handleTrafficLightsSpacing';
import { listenToMessageBoxEvents } from './preloadScript/listenToMessageBoxEvents';
import { listenToScreenSharingRequests } from './preloadScript/listenToScreenSharingRequests';
import { listenToNotificationsRequests } from './preloadScript/notifications';
import { setServerUrl } from './preloadScript/setUrlResolver';
import { createRendererReduxStore } from './rendererProcess/createRendererReduxStore';
import { setupRendererErrorHandling } from './rendererProcess/setupRendererErrorHandling';
import { whenReady } from './rendererProcess/whenReady';

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

  setReduxStore(await createRendererReduxStore());

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
