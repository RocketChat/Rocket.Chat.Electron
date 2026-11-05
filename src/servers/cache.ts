import { webContents, type WebContents } from 'electron';

import { summarizeError } from '../e2eeSearch/errorSummary';
import { loggers } from '../logging/scopes';
import { listen } from '../store';
import {
  CLEAR_CACHE_DIALOG_DELETE_LOGIN_AND_SEARCH_DATA_CLICKED,
  CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED,
  CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED,
  WEBVIEW_USER_LOGGED_IN,
} from '../ui/actions';
import {
  getServerUrlByWebContentsId,
  getWebContentsByServerUrl,
} from '../ui/main/serverView';
import type { Server } from './common';

export const clearWebviewStorageKeepingLoginData = async (
  guestWebContents: WebContents
) => {
  if (!guestWebContents) return;
  await guestWebContents.session.clearCache();
  await guestWebContents.session.clearStorageData({
    storages: [
      'cookies',
      'indexdb',
      'filesystem',
      'shadercache',
      'serviceworkers',
      'cachestorage',
    ],
  });
  guestWebContents?.reloadIgnoringCache();
};

export const clearWebviewStorageDeletingLoginData = async (
  guestWebContents: WebContents,
  keepSearchMetadataForWorkspace?: string
) => {
  if (!guestWebContents) return;
  await guestWebContents.session.clearCache();
  let localStorageCleared = false;
  if (keepSearchMetadataForWorkspace !== undefined) {
    try {
      await clearLocalStorageKeepingSearchIndexMetadata(
        guestWebContents,
        keepSearchMetadataForWorkspace
      );
      localStorageCleared = true;
    } catch (error) {
      // If the page cannot clear login data, the session-wide clear must do it.
      loggers.e2eeSearch.warn(
        'local search metadata not kept after a login data clear',
        summarizeError(error)
      );
    }
  }
  if (localStorageCleared) {
    await guestWebContents.session.clearStorageData({
      storages: [
        'cookies',
        'indexdb',
        'filesystem',
        'shadercache',
        'serviceworkers',
        'cachestorage',
      ],
    });
  } else {
    await guestWebContents.session.clearStorageData();
  }
  guestWebContents?.reloadIgnoringCache();
};

// Match the web client's workspace identity, not a route within the workspace.
const canonicalWorkspace = (workspaceUrl: string): string | undefined => {
  try {
    const url = new URL(workspaceUrl);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url.href;
  } catch {
    return undefined;
  }
};

// Removing and restoring consent sends a transient opt-out to other pages,
// which can delete the retained index. Leave valid scoped metadata untouched.
const clearLocalStorageKeepingSearchIndexMetadata = async (
  guestWebContents: WebContents,
  workspaceUrl: string
): Promise<void> => {
  const workspace = canonicalWorkspace(workspaceUrl);
  await guestWebContents.executeJavaScript(`(() => {
    const workspace = ${JSON.stringify(workspace ?? null)};
    const consentPrefix = 'E2EESearch_OptIn_v2_';
    const syncTimePrefix = 'E2EESearch_SyncedAt_v2_';
    const keep = (key) => {
      const prefix = key.startsWith(consentPrefix) ? consentPrefix :
        key.startsWith(syncTimePrefix) ? syncTimePrefix : undefined;
      if (!workspace || !prefix) return false;
      try {
        const suffix = key.slice(prefix.length);
        const scope = JSON.parse(suffix);
        if (!Array.isArray(scope) || scope.length !== 2 ||
            scope[0] !== workspace || typeof scope[1] !== 'string' ||
            !scope[1] || JSON.stringify(scope) !== suffix) return false;
        const value = localStorage.getItem(key);
        return prefix === consentPrefix ? value === 'true' :
          value !== null && Number.isFinite(Number(value)) && Number(value) > 0;
      } catch {
        return false;
      }
    };
    for (const key of Object.keys(localStorage)) {
      if (!keep(key)) localStorage.removeItem(key);
    }
  })()`);
};

export const handleClearCacheDialog = () => {
  listen(CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED, async (action) => {
    const guestWebContents = webContents.fromId(action.payload);
    if (!guestWebContents) {
      return;
    }
    await clearWebviewStorageKeepingLoginData(guestWebContents);
  });

  // The local search opt-in stays, like on a logout, unless the user also
  // chose to remove the search data.
  listen(CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED, async (action) => {
    const guestWebContents = webContents.fromId(action.payload);
    if (!guestWebContents) {
      return;
    }
    await clearWebviewStorageDeletingLoginData(
      guestWebContents,
      getServerUrlByWebContentsId(action.payload)
    );
  });

  // The search index of the server goes in src/e2eeSearch/setup.ts.
  listen(
    CLEAR_CACHE_DIALOG_DELETE_LOGIN_AND_SEARCH_DATA_CLICKED,
    async (action) => {
      const guestWebContents = webContents.fromId(action.payload);
      if (!guestWebContents) {
        return;
      }
      await clearWebviewStorageDeletingLoginData(guestWebContents);
    }
  );
};

const previousUserLoggedInByUrl = new Map<
  Server['url'],
  Server['userLoggedIn']
>();

export const handleUserLoggedOutDataClearing = (): void => {
  listen(WEBVIEW_USER_LOGGED_IN, async (action) => {
    const { url, userLoggedIn } = action.payload;
    const wasLoggedIn = previousUserLoggedInByUrl.get(url);
    previousUserLoggedInByUrl.set(url, userLoggedIn);

    if (wasLoggedIn !== true || userLoggedIn !== false) {
      return;
    }

    const guestWebContents = getWebContentsByServerUrl(url);
    if (!guestWebContents) {
      return;
    }
    await clearWebviewStorageDeletingLoginData(guestWebContents, url);
  });
};
