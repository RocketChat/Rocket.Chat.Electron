import type { Store } from 'redux';

import * as serverActions from '../common/actions/serverActions';
import type { RocketChatDesktopAPI } from '../common/types/RocketChatDesktopAPI';
import type { RootAction } from '../common/types/RootAction';
import type { RootState } from '../common/types/RootState';
import type { Server } from '../common/types/Server';
import { createNotification, destroyNotification } from './notifications';
import { resolveFavicon } from './resolveFavicon';
import { resolveStyle } from './resolveStyle';

export const createRocketChatDesktopSingleton = (
  serverUrl: Server['url'],
  store: Store<RootState, RootAction>
): RocketChatDesktopAPI => {
  let absoluteUrl: (path?: string) => string;
  let setUserOnline: (online: boolean) => void;

  return {
    versionChanged(version) {
      store.dispatch(serverActions.versionChanged(serverUrl, version));
    },
    badgeChanged(badge) {
      store.dispatch(serverActions.badgeChanged(serverUrl, badge));
    },
    async faviconChanged(faviconUrl) {
      const favicon = faviconUrl ? await resolveFavicon(faviconUrl) : undefined;
      store.dispatch(serverActions.faviconChanged(serverUrl, favicon));
    },
    async backgroundChanged(backgroundUrl) {
      const style = await resolveStyle(backgroundUrl);
      store.dispatch(serverActions.styleChanged(serverUrl, style));
    },
    titleChanged(title) {
      store.dispatch(serverActions.titleChanged(serverUrl, title));
    },
    userPresenceParamsChanged(autoAwayEnabled, idleThreshold) {
      store.dispatch(
        serverActions.userPresenceParamsChanged(
          serverUrl,
          autoAwayEnabled
            ? {
                autoAwayEnabled: true,
                idleThreshold,
              }
            : {
                autoAwayEnabled: false,
              }
        )
      );
    },
    setCallbacks(callbacks) {
      absoluteUrl = callbacks.absoluteUrl;
      setUserOnline = callbacks.setUserOnline;
    },
    absoluteUrl: (path) => absoluteUrl(path),
    setUserOnline: (online) => setUserOnline(online),
    getServerUrl: () => serverUrl,
    createNotification,
    destroyNotification,
  };
};
