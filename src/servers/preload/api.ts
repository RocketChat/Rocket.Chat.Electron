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
import { SENTINEL_PREFIX } from '../buildCheckDecision';
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
    let buildIdSource: 'commit' | 'version' | undefined;
    if (commitHash) {
      buildIdSource = 'commit';
    } else if (versionStr) {
      buildIdSource = 'version';
    }
    // `cache_version` cookie is an optional proxy-supplied signal — stock
    // Rocket.Chat does not set it. Best-effort: absent on most deployments.
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
  notifyBundleAutoupdate: ({
    bundleVersion,
  }: {
    bundleVersion?: string;
  }): void => {
    // newClientAvailable() fired; if Meteor's private store didn't yield a
    // version string, synthesize a per-event sentinel so the main process
    // still treats this as a real bundle change and clears the cache.
    const buildId = bundleVersion || `${SENTINEL_PREFIX}${Date.now()}`;
    setServerBuildSignals({ buildId, buildIdSource: 'autoupdate' });
  },
};
