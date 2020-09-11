import { webFrame } from 'electron';
import { satisfies, coerce } from 'semver';

import { setupRendererErrorHandling } from './errors';
import { createJitsiMeetElectronAPI, JitsiMeetElectronAPI } from './jitsi/preload';
import { listenToScreenSharingRequests } from './screenSharing/preload';
import { RocketChatDesktopAPI, createRocketChatDesktopAPI, serverInfo } from './servers/preload/api';
import { setupSpellChecking } from './spellChecking/preload';
import { createRendererReduxStore } from './store';
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

const start = async (): Promise<void> => {
  await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('webviewPreload');
  setupSpellChecking();

  window.JitsiMeetElectron = createJitsiMeetElectronAPI();
  window.RocketChatDesktop = createRocketChatDesktopAPI();

  await webFrame.executeJavaScript(`(() => {
    if (typeof window.require !== 'function') {
      return;
    }

    const { Info: serverInfo = {} } = window.require('/app/utils/rocketchat.info') ?? {};

    if (!serverInfo.version) {
      return;
    }

    window.RocketChatDesktop.setServerInfo(serverInfo);

    const { Meteor } = window.require('meteor/meteor');
    const { Session } = window.require('meteor/session');
    const { Tracker } = window.require('meteor/tracker');
    const { settings } = window.require('/app/settings');

    window.RocketChatDesktop.setUrlResolver(Meteor.absoluteUrl);

    Tracker.autorun(() => {
      window.RocketChatDesktop.setBadge(Session.get('unread'));
    });

    Tracker.autorun(() => {
      const { url, defaultUrl } = settings.get('Assets_favicon') || {};
      window.RocketChatDesktop.setFavicon(url || defaultUrl);
    });

    Tracker.autorun(() => {
      const { url, defaultUrl } = settings.get('Assets_background') || {};
      window.RocketChatDesktop.setBackground(url || defaultUrl);
    });

    Tracker.autorun(() => {
      const siteName = settings.get('Site_Name');
      window.RocketChatDesktop.setTitle(siteName);
    });

    window.Notification = window.RocketChatDesktop.Notification;
  })()`);

  if (!satisfies(coerce(serverInfo?.version), '>=3.0.x')) {
    return;
  }

  listenToScreenSharingRequests();
  listenToUserPresenceChanges();
  listenToMessageBoxEvents();
  handleTrafficLightsSpacing();
};

start();
