import type { RocketChatDesktopAPI } from '../../common/types/RocketChatDesktopAPI';
import type { ServerInfo } from '../../common/types/ServerInfo';
import {
  createNotification,
  destroyNotification,
} from '../../notifications/preload';
import { setUserPresenceDetection } from '../../userPresence/preload';
import { setBadge } from './badge';
import { setFavicon } from './favicon';
import { setBackground } from './sidebar';
import { setTitle } from './title';
import { setUrlResolver } from './urls';

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
