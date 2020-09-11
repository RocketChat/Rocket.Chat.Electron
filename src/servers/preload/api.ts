import { createNotificationAPI } from '../../notifications/preload';
import { setUserPresenceDetection } from '../../userPresence/preload';
import { Server } from '../common';
import { setBadge } from './badge';
import { setFavicon } from './favicon';
import { setBackground } from './sidebar';
import { setTitle } from './title';
import { setUrlResolver } from './urls';

type ServerInfo = {
  version: string;
};

export let serverInfo: ServerInfo;

export type RocketChatDesktopAPI = {
  setServerInfo: (serverInfo: ServerInfo) => void;
  setUrlResolver: (getAbsoluteUrl: (relativePath?: string) => string) => void;
  setBadge: (badge: Server['badge']) => void;
  setFavicon: (faviconUrl: string) => void;
  setBackground: (imageUrl: string) => void;
  setTitle: (title: string) => void;
  setUserPresenceDetection: (options: {
    isAutoAwayEnabled: boolean;
    idleThreshold: number;
    setUserOnline: (online: boolean) => void;
  }) => void;
  Notification: typeof Notification;
};

export const createRocketChatDesktopAPI = (): RocketChatDesktopAPI => ({
  setServerInfo: (_serverInfo) => {
    serverInfo = _serverInfo;
  },
  setUrlResolver,
  setBadge,
  setFavicon,
  setBackground,
  setTitle,
  setUserPresenceDetection,
  Notification: createNotificationAPI(),
});
