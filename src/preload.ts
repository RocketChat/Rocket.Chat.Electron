import { setupRendererErrorHandling } from './errors';
import { setupEditFlagsHandling } from './preload/editFlags';
import { isJitsi, setupJitsiPage } from './preload/jitsi';
import { isRocketChat, setupRocketChatPage } from './preload/rocketChat';
import { setupSpellChecking } from './preload/spellChecking';
import { createRendererReduxStore } from './store';
import { whenReady } from './whenReady';

const start = async (): Promise<void> => {
  await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('webviewPreload');
  setupEditFlagsHandling();
  setupSpellChecking();

  if (isRocketChat()) {
    setupRocketChatPage();
  }

  if (isJitsi()) {
    setupJitsiPage();
  }
};

start();
