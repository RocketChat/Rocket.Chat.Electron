import { setupRendererErrorHandling } from './errors';
import { createJitsiMeetElectron, IJitsiMeetElectron } from './jitsi/preload';
import { listenToNotificationsRequests } from './notifications/preload';
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
    JitsiMeetElectron: IJitsiMeetElectron;
  }
}

const start = async (): Promise<void> => {
  await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('webviewPreload');
  setupSpellChecking();

  const JitsiMeetElectron = createJitsiMeetElectron();

  window.JitsiMeetElectron = JitsiMeetElectron;

  if (isRocketChat()) {
    setupRocketChatPage();
    listenToScreenSharingRequests();
    listenToUserPresenceChanges();
    listenToNotificationsRequests();
    listenToMessageBoxEvents();
    handleTrafficLightsSpacing();
  }
};

start();
