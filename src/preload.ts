import { contextBridge } from 'electron';

import { setReduxStore } from './common/store';
import { invoke } from './ipc/renderer';
import { JitsiMeetElectron } from './preloadScript/JitsiMeetElectron';
import { createRocketChatDesktopSingleton } from './preloadScript/createRocketChatDesktopSingleton';
import { handleTrafficLightsSpacing } from './preloadScript/handleTrafficLightsSpacing';
import { listenUserPresenceChanges } from './preloadScript/listenUserPresenceChanges';
import { rootSaga } from './preloadScript/sagas';
import { listenToScreenSharingRequests } from './preloadScript/screenSharing';
import { setServerUrl } from './preloadScript/setUrlResolver';
import { createRendererReduxStore } from './rendererProcess/createRendererReduxStore';
import { setupRendererErrorHandling } from './rendererProcess/setupRendererErrorHandling';
import { whenReady } from './rendererProcess/whenReady';

const start = async (): Promise<void> => {
  contextBridge.exposeInMainWorld('JitsiMeetElectron', JitsiMeetElectron);

  const serverUrl = await invoke('server-view/get-url');

  if (!serverUrl) {
    return;
  }

  setServerUrl(serverUrl);

  const reduxStore = await createRendererReduxStore(rootSaga, serverUrl);
  setReduxStore(reduxStore);

  const rocketChatDesktop = createRocketChatDesktopSingleton(
    serverUrl,
    reduxStore
  );

  contextBridge.exposeInMainWorld('RocketChatDesktop', rocketChatDesktop);

  await whenReady();

  setupRendererErrorHandling('webviewPreload');

  await invoke('server-view/ready');

  listenToScreenSharingRequests();
  handleTrafficLightsSpacing();
  listenUserPresenceChanges(rocketChatDesktop);
};

start();
