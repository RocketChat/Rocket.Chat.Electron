import fs from 'fs';
import path from 'path';

import { contextBridge, ipcRenderer, webFrame } from 'electron';
import { satisfies, coerce } from 'semver';

import { setupRendererErrorHandling } from './errors';
import { JitsiMeetElectron, JitsiMeetElectronAPI } from './jitsi/preload';
import { listenToNotificationsRequests } from './notifications/preload';
import { listenToScreenSharingRequests } from './screenSharing/preload';
import { RocketChatDesktop, RocketChatDesktopAPI, serverInfo } from './servers/preload/api';
import { setServerUrl } from './servers/preload/urls';
import { setupSpellChecking } from './spellChecking/preload';
import { createRendererReduxStore, select } from './store';
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
  const serverUrl = await ipcRenderer.invoke('server-url');
  setServerUrl(serverUrl);

  await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('webviewPreload');
  setupSpellChecking();

  const injectedCode = await fs.promises.readFile(
    path.join(select(({ appPath }) => appPath), 'app/injected.js'),
    'utf8',
  );
  await webFrame.executeJavaScript(injectedCode);

  if (!satisfies(coerce(serverInfo?.version), '>=3.0.x')) {
    return;
  }

  listenToNotificationsRequests();
  listenToScreenSharingRequests();
  listenToUserPresenceChanges();
  listenToMessageBoxEvents();
  handleTrafficLightsSpacing();
};

start();
