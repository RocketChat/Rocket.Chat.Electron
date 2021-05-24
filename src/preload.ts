import { contextBridge } from 'electron';

import { setReduxStore } from './common/store';
import type { RocketChatDesktopAPI } from './common/types/RocketChatDesktopAPI';
import { invoke } from './ipc/renderer';
import { JitsiMeetElectron } from './preloadScript/JitsiMeetElectron';
import { createRocketChatDesktopSingleton } from './preloadScript/createRocketChatDesktopSingleton';
import { rootSaga } from './preloadScript/sagas';
import { setServerUrl } from './preloadScript/setUrlResolver';
import { createRendererReduxStore } from './rendererProcess/createRendererReduxStore';
import { whenReady } from './rendererProcess/whenReady';

const start = async (): Promise<void> => {
  contextBridge.exposeInMainWorld('JitsiMeetElectron', JitsiMeetElectron);

  const serverUrl = await invoke('server-view/get-url');

  if (!serverUrl) {
    return;
  }

  setServerUrl(serverUrl);

  const rocketChatDesktopRef: { current: null | RocketChatDesktopAPI } = {
    current: null,
  };

  const reduxStore = await createRendererReduxStore(
    rootSaga,
    serverUrl,
    rocketChatDesktopRef
  );
  setReduxStore(reduxStore);

  const rocketChatDesktop = createRocketChatDesktopSingleton(
    serverUrl,
    reduxStore
  );
  rocketChatDesktopRef.current = rocketChatDesktop;

  contextBridge.exposeInMainWorld('RocketChatDesktop', rocketChatDesktop);

  await whenReady();

  await invoke('server-view/ready');
};

start();
