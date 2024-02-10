import {
  createNotification,
  destroyNotification,
} from '../../notifications/preload';
import {
  getOutlookEvents,
  setOutlookExchangeUrl,
  hasOutlookCredentials,
  clearOutlookCredentials,
  setUserToken,
} from '../../outlookCalendar/preload';
import type { OutlookEventsResponse } from '../../outlookCalendar/type';
import { setUserPresenceDetection } from '../../userPresence/preload';
import type { Server } from '../common';
import { setBadge } from './badge';
import { writeTextToClipboard } from './clipboard';
import { openDocumentViewer } from './documentViewer';
import { setFavicon } from './favicon';
import { setGitCommitHash } from './gitCommitHash';
import type { videoCallWindowOptions } from './internalVideoChatWindow';
import {
  getInternalVideoChatWindowEnabled,
  openInternalVideoChatWindow,
} from './internalVideoChatWindow';
import {
  setBackground,
  setServerVersionToSidebar,
  setSidebarCustomTheme,
} from './sidebar';
import { setUserThemeAppearance } from './themeAppearance';
import { setTitle } from './title';
import { setUrlResolver } from './urls';
import { setUserLoggedIn } from './userLoggedIn';

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
  setSidebarCustomTheme: (customTheme: string) => void;
  setTitle: (title: string) => void;
  setUserLoggedIn: (userLoggedIn: boolean) => void;
  setUserPresenceDetection: (options: {
    isAutoAwayEnabled: boolean;
    idleThreshold: number | null;
    setUserOnline: (online: boolean) => void;
  }) => void;
  setUserThemeAppearance: (themeAppearance: Server['themeAppearance']) => void;
  createNotification: (
    options: NotificationOptions & {
      canReply?: boolean;
      title: string;
      onEvent: (eventDescriptor: { type: string; detail: unknown }) => void;
    }
  ) => Promise<unknown>;
  destroyNotification: (id: unknown) => void;
  getInternalVideoChatWindowEnabled: () => boolean;
  openInternalVideoChatWindow: (
    url: string,
    options: videoCallWindowOptions
  ) => void;
  setGitCommitHash: (gitCommitHash: string) => void;
  writeTextToClipboard: (text: string) => void;
  getOutlookEvents: (date: Date) => Promise<OutlookEventsResponse>;
  setOutlookExchangeUrl: (url: string, userId: string) => void;
  hasOutlookCredentials: () => Promise<boolean>;
  clearOutlookCredentials: () => void;
  setUserToken: (token: string, userId: string) => void;
  openDocumentViewer: (url: string, format: string, options: any) => void;
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
    setServerVersionToSidebar(_serverInfo.version);
  },
  setUrlResolver,
  setBadge,
  setFavicon,
  setBackground,
  setTitle,
  setUserPresenceDetection,
  setUserLoggedIn,
  setUserThemeAppearance,
  createNotification,
  destroyNotification,
  getInternalVideoChatWindowEnabled,
  openInternalVideoChatWindow,
  setGitCommitHash,
  writeTextToClipboard,
  getOutlookEvents,
  setOutlookExchangeUrl,
  hasOutlookCredentials,
  clearOutlookCredentials,
  setUserToken,
  setSidebarCustomTheme,
  openDocumentViewer,
};
