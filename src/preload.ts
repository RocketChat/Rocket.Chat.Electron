import { setupRendererErrorHandling } from './errors';
import { createJitsiMeetElectronAPI, JitsiMeetElectronAPI } from './jitsi/preload';
import { createNotificationAPI } from './notifications/preload';
import { listenToScreenSharingRequests } from './screenSharing/preload';
import { isRocketChat, setupRocketChatPage } from './servers/preload';
import { setupSpellChecking } from './spellChecking/preload';
import { createRendererReduxStore } from './store';
import { listenToMessageBoxEvents } from './ui/preload/messageBox';
import { handleTrafficLightsSpacing } from './ui/preload/sidebar';
import { listenToUserPresenceChanges } from './userPresence/preload';
import { whenReady } from './whenReady';

declare global {
  interface Window {
    JitsiMeetElectron: JitsiMeetElectronAPI;
  }
}

const start = async (): Promise<void> => {
  await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('webviewPreload');
  setupSpellChecking();

  window.JitsiMeetElectron = createJitsiMeetElectronAPI();

  if (isRocketChat()) {
    window.Notification = createNotificationAPI();

    setupRocketChatPage();
    listenToScreenSharingRequests();
    listenToUserPresenceChanges();
    listenToMessageBoxEvents();
    handleTrafficLightsSpacing();
  }
};

start();
