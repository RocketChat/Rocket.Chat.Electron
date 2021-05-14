import { contextBridge } from 'electron';

import { setReduxStore } from './common/store';
import { invoke } from './ipc/renderer';
import { JitsiMeetElectron } from './preloadScript/JitsiMeetElectron';
import {
  RocketChatDesktop,
  serverInfo,
} from './preloadScript/RocketChatDesktop';
import { handleTrafficLightsSpacing } from './preloadScript/handleTrafficLightsSpacing';
import { listenToMessageBoxEvents } from './preloadScript/listenToMessageBoxEvents';
import { listenToNotificationsRequests } from './preloadScript/notifications';
import { rootSaga } from './preloadScript/sagas';
import { listenToScreenSharingRequests } from './preloadScript/screenSharing';
import { setServerUrl } from './preloadScript/setUrlResolver';
import { createRendererReduxStore } from './rendererProcess/createRendererReduxStore';
import { setupRendererErrorHandling } from './rendererProcess/setupRendererErrorHandling';
import { whenReady } from './rendererProcess/whenReady';

const start = async (): Promise<void> => {
  const serverUrl = await invoke('server-view/get-url');

  contextBridge.exposeInMainWorld('JitsiMeetElectron', JitsiMeetElectron);

  if (!serverUrl) {
    return;
  }

  contextBridge.exposeInMainWorld('RocketChatDesktop', RocketChatDesktop);

  setServerUrl(serverUrl);

  const reduxStore = await createRendererReduxStore(rootSaga);
  setReduxStore(reduxStore);

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
