import type { IRocketChatDesktop } from '@rocket.chat/desktop-api';

import type { CustomNotificationOptions } from '../../notifications/common';
import {
  createNotification,
  destroyNotification,
  dispatchCustomNotification,
  closeCustomNotification,
} from '../../notifications/preload';
import {
  getOutlookEvents,
  setOutlookExchangeUrl,
  hasOutlookCredentials,
  clearOutlookCredentials,
  setUserToken,
} from '../../outlookCalendar/preload';
import { setUserPresenceDetection } from '../../userPresence/preload';
import { setBadge } from './badge';
import { writeTextToClipboard } from './clipboard';
import { openDocumentViewer } from './documentViewer';
import { setFavicon } from './favicon';
import { setGitCommitHash } from './gitCommitHash';
import {
  getInternalVideoChatWindowEnabled,
  openInternalVideoChatWindow,
} from './internalVideoChatWindow';
import { reloadServer } from './reloadServer';
import { setServerBuildSignals } from './serverBuild';
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
  commit?: {
    hash?: string;
  };
};

export let serverInfo: ServerInfo;
let cb = (_serverInfo: ServerInfo): void => undefined;

type ExtendedIRocketChatDesktop = IRocketChatDesktop & {
  dispatchCustomNotification: (
    options: CustomNotificationOptions
  ) => Promise<unknown>;
  closeCustomNotification: (id: unknown) => void;
  notifyBundleAutoupdate: (payload: { bundleVersion?: string }) => void;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    RocketChatDesktop: ExtendedIRocketChatDesktop;
  }
}

export const RocketChatDesktop: Window['RocketChatDesktop'] = {
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
    const extended = _serverInfo as ServerInfo;
    const commitHash = extended?.commit?.hash;
    const versionStr = extended?.version;
    const buildId = commitHash || versionStr;
    const buildIdSource: 'commit' | 'version' | undefined = commitHash
      ? 'commit'
      : versionStr
      ? 'version'
      : undefined;
    const cacheVersionMatch =
      typeof document !== 'undefined'
        ? document.cookie?.match(/(?:^|;\s*)cache_version=([^;]+)/)
        : null;
    const cacheVersion = cacheVersionMatch?.[1];
    setServerBuildSignals({ buildId, cacheVersion, buildIdSource });
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
  dispatchCustomNotification,
  closeCustomNotification,
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
  reloadServer,
  notifyBundleAutoupdate: ({ bundleVersion }) => {
    if (!bundleVersion) return;
    setServerBuildSignals({ buildId: bundleVersion, buildIdSource: 'autoupdate' });
  },
};
