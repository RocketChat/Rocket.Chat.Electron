import {
  createNotification,
  destroyNotification,
} from '../../notifications/preload';
import { setUserPresenceDetection } from '../../userPresence/preload';
import { Server } from '../common';
import { setBadge } from './badge';
import { setFavicon } from './favicon';
import { setGitCommitHash } from './gitCommitHash';
import { getInternalVideoChatWindowEnabled } from './internalVideoChatWindow';
import { setBackground } from './sidebar';
import { setTitle } from './title';
import { setUrlResolver } from './urls';

type ServerInfo = {
  version: string;
};

export let serverInfo: ServerInfo;
let cb = (_serverInfo: ServerInfo): void => undefined;

export type RocketChatDesktopAPI = {
  onReady: (cb: (serverInfo: ServerInfo) => void) => void;
  setServerInfo: (serverInfo: ServerInfo) => void;
  setUrlResolver: (getAbsoluteUrl: (relativePath?: string) => string) => void;
  setBadge: (badge: Server['badge']) => void;
  setFavicon: (faviconUrl: string) => void;
  setBackground: (imageUrl: string) => void;
  setTitle: (title: string) => void;
  setUserPresenceDetection: (options: {
    isAutoAwayEnabled: boolean;
    idleThreshold: number | null;
    setUserOnline: (online: boolean) => void;
  }) => void;
  createNotification: (
    options: NotificationOptions & {
      canReply?: boolean;
      title: string;
      onEvent: (eventDescriptor: { type: string; detail: unknown }) => void;
    }
  ) => Promise<unknown>;
  destroyNotification: (id: unknown) => void;
  getInternalVideoChatWindowEnabled: () => boolean;
  setGitCommitHash: (gitCommitHash: string) => void;
};

export const RocketChatDesktop: RocketChatDesktopAPI = {
  onReady: (c) => {
    if (serverInfo) {
      c(serverInfo);
    }
    cb = c;
  },
  setServerInfo: (_serverInfo) => {
    serverInfo = _serverInfo;
    cb(_serverInfo);
  },
  setUrlResolver,
  setBadge,
  setFavicon,
  setBackground,
  setTitle,
  setUserPresenceDetection,
  createNotification,
  destroyNotification,
  getInternalVideoChatWindowEnabled,
  setGitCommitHash,
};
