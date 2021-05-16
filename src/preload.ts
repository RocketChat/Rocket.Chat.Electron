import { contextBridge } from 'electron';

import { setReduxStore } from './common/store';
import { invoke } from './ipc/renderer';
import { JitsiMeetElectron } from './preloadScript/JitsiMeetElectron';
import { RocketChatDesktop } from './preloadScript/RocketChatDesktop';
import { handleTrafficLightsSpacing } from './preloadScript/handleTrafficLightsSpacing';
import { listenToMessageBoxEvents } from './preloadScript/listenToMessageBoxEvents';
import { listenUserPresenceChanges } from './preloadScript/listenUserPresenceChanges';
import { listenToNotificationsRequests } from './preloadScript/notifications';
import { rootSaga } from './preloadScript/sagas';
import { listenToScreenSharingRequests } from './preloadScript/screenSharing';
import { setServerUrl } from './preloadScript/setUrlResolver';
import { createRendererReduxStore } from './rendererProcess/createRendererReduxStore';
import { setupRendererErrorHandling } from './rendererProcess/setupRendererErrorHandling';
import { whenReady } from './rendererProcess/whenReady';

const start = async (): Promise<void> => {
  contextBridge.exposeInMainWorld('JitsiMeetElectron', JitsiMeetElectron);
  contextBridge.exposeInMainWorld('RocketChatDesktop', RocketChatDesktop);

  const serverUrl = await invoke('server-view/get-url');

  if (!serverUrl) {
    return;
  }

  setServerUrl(serverUrl);

  const reduxStore = await createRendererReduxStore(rootSaga);
  setReduxStore(reduxStore);

  await whenReady();

  setupRendererErrorHandling('webviewPreload');

  await invoke('server-view/ready');

  listenToNotificationsRequests();
  listenToScreenSharingRequests();
  listenToMessageBoxEvents();
  handleTrafficLightsSpacing();
  listenUserPresenceChanges();
};

start();
