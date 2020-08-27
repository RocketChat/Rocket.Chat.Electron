import { setupRendererErrorHandling } from './errors';
import { isJitsi, setupJitsiMeetElectron } from './jitsi/preload';
import { listenToNotificationsRequests } from './notifications/preload';
import { listenToScreenSharingRequests } from './screenSharing/preload';
import { isRocketChat, setupRocketChatPage } from './servers/preload';
import { setupSpellChecking } from './spellChecking/preload';
import { createRendererReduxStore } from './store';
import { listenToMessageBoxEvents } from './ui/preload/messageBox';
import { handleTrafficLightsSpacing } from './ui/preload/sidebar';
import { listenToUserPresenceChanges } from './userPresence/preload';
import { whenReady } from './whenReady';

const start = async (): Promise<void> => {
  await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('webviewPreload');
  setupSpellChecking();

  if (isRocketChat()) {
    setupRocketChatPage();
    listenToScreenSharingRequests();
    listenToUserPresenceChanges();
    listenToNotificationsRequests();
    listenToMessageBoxEvents();
    handleTrafficLightsSpacing();
  }

  if (isJitsi()) {
    setupJitsiMeetElectron();
  }
};

start();
