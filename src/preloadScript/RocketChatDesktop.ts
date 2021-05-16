import * as serverActions from '../common/actions/serverActions';
import { dispatch } from '../common/store';
import type { RocketChatDesktopAPI } from '../common/types/RocketChatDesktopAPI';
import { createNotification, destroyNotification } from './notifications';
import { resolveFavicon } from './resolveFavicon';
import { resolveStyle } from './resolveStyle';
import { getServerUrl } from './setUrlResolver';

export let absoluteUrl: (path?: string) => string;
export let setUserOnline: (online: boolean) => void;

export const RocketChatDesktop: RocketChatDesktopAPI = {
  versionChanged(version) {
    dispatch(serverActions.versionChanged(getServerUrl(), version));
  },
  badgeChanged(badge) {
    dispatch(serverActions.badgeChanged(getServerUrl(), badge));
  },
  async faviconChanged(faviconUrl) {
    const favicon = faviconUrl ? await resolveFavicon(faviconUrl) : undefined;
    dispatch(serverActions.faviconChanged(getServerUrl(), favicon));
  },
  async backgroundChanged(backgroundUrl) {
    const style = await resolveStyle(backgroundUrl);
    dispatch(serverActions.styleChanged(getServerUrl(), style));
  },
  titleChanged(title) {
    dispatch(serverActions.titleChanged(getServerUrl(), title));
  },
  userPresenceParamsChanged(autoAwayEnabled, idleThreshold) {
    dispatch(
      serverActions.userPresenceParamsChanged(
        getServerUrl(),
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
  createNotification,
  destroyNotification,
};
