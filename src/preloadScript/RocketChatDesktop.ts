import type { RocketChatDesktopAPI } from '../common/types/RocketChatDesktopAPI';
import type { ServerInfo } from '../common/types/ServerInfo';
import { createNotification, destroyNotification } from './notifications';
import { setBackground } from './setBackground';
import { setBadge } from './setBadge';
import { setFavicon } from './setFavicon';
import { setTitle } from './setTitle';
import { setUrlResolver } from './setUrlResolver';
import { setUserPresenceDetection } from './setUserPresenceDetection';

export let serverInfo: ServerInfo;

export const RocketChatDesktop: RocketChatDesktopAPI = {
  setServerInfo: (_serverInfo) => {
    serverInfo = _serverInfo;
  },
  setUrlResolver,
  setBadge,
  setFavicon,
  setBackground,
  setTitle,
  setUserPresenceDetection,
  createNotification,
  destroyNotification,
};
