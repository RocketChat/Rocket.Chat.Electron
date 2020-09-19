import { contextBridge, ipcRenderer, webFrame } from 'electron';
import { satisfies, coerce } from 'semver';

import { setupRendererErrorHandling } from './errors';
import { JitsiMeetElectron, JitsiMeetElectronAPI } from './jitsi/preload';
import { listenToNotificationsRequests } from './notifications/preload';
import { listenToScreenSharingRequests } from './screenSharing/preload';
import { RocketChatDesktop, RocketChatDesktopAPI, serverInfo } from './servers/preload/api';
import { setServerUrl } from './servers/preload/urls';
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

contextBridge.exposeInMainWorld('JitsiMeetElectron', JitsiMeetElectron);
contextBridge.exposeInMainWorld('RocketChatDesktop', RocketChatDesktop);

const start = async (): Promise<void> => {
  const serverUrl = await ipcRenderer.invoke('server-url');
  setServerUrl(serverUrl);

  await createRendererReduxStore();

  await whenReady();

  setupRendererErrorHandling('webviewPreload');
  setupSpellChecking();

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
    const { UserPresence } = window.require('meteor/konecty:user-presence');
    const { settings } = window.require('/app/settings');
    const { getUserPreference } = window.require('/app/utils');

    window.RocketChatDesktop.setUrlResolver(Meteor.absoluteUrl);

    Tracker.autorun(() => {
      const unread = Session.get('unread');
      window.RocketChatDesktop.setBadge(unread);
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

    Tracker.autorun(() => {
      const uid = Meteor.userId();
      const isAutoAwayEnabled = getUserPreference(uid, 'enableAutoAway');
      const idleThreshold = getUserPreference(uid, 'idleTimeLimit');

      if (isAutoAwayEnabled) {
        delete UserPresence.awayTime;
        UserPresence.start();
      }

      window.RocketChatDesktop.setUserPresenceDetection({
        isAutoAwayEnabled,
        idleThreshold,
        setUserOnline: (online) => {
          Meteor.call('UserPresence:setDefaultStatus', online ? 'online' : 'away');
        },
      });
    });

    window.Notification = window.RocketChatDesktop.Notification;
  })()`);

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
