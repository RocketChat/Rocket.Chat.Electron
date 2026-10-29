import { webContents, type WebContents } from 'electron';

import { summarizeError } from '../e2eeSearch/errorSummary';
import { MAX_ID_LENGTH } from '../e2eeSearch/validate';
import { loggers } from '../logging/scopes';
import { listen } from '../store';
import {
  CLEAR_CACHE_DIALOG_DELETE_LOGIN_AND_SEARCH_DATA_CLICKED,
  CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED,
  CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED,
  WEBVIEW_USER_LOGGED_IN,
} from '../ui/actions';
import { getWebContentsByServerUrl } from '../ui/main/serverView';
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
  keepTrueLocalStorageKeys: readonly string[] = []
) => {
  if (!guestWebContents) return;
  await guestWebContents.session.clearCache();
  await guestWebContents.session.clearStorageData();
  if (keepTrueLocalStorageKeys.length > 0) {
    // The storage is already clear, so the reload still runs: it ends the
    // session of the page. The next login then reads the opt-in as off.
    await guestWebContents
      .executeJavaScript(
        `for (const key of ${JSON.stringify(keepTrueLocalStorageKeys)}) localStorage.setItem(key, 'true');`
      )
      .catch((error) =>
        loggers.e2eeSearch.warn(
          'local search opt-in not kept after a login data clear',
          { keys: keepTrueLocalStorageKeys.length, ...summarizeError(error) }
        )
      );
  }
  guestWebContents?.reloadIgnoringCache();
};

// The web client keeps each user's choice to index their encrypted messages
// on this device in the local storage (`E2EESearch_OptIn_<userId>`). The
// sealed search index stays on the device after a logout, so the choice must
// stay with it: without it, the next login reads "off" and wipes the index.
// Only keys with a user id that the search index accepts
// (`validateScope`) and the value 'true' are kept.
const searchIndexOptInKey = new RegExp(
  `^E2EESearch_OptIn_[A-Za-z0-9_-]{1,${MAX_ID_LENGTH}}$`
);

const readSearchIndexOptIns = async (
  guestWebContents: WebContents
): Promise<string[]> => {
  try {
    const keys: unknown = await guestWebContents.executeJavaScript(
      `Object.keys(localStorage).filter((key) => key.startsWith('E2EESearch_OptIn_') && localStorage.getItem(key) === 'true')`
    );
    return Array.isArray(keys)
      ? keys.filter(
          (key): key is string =>
            typeof key === 'string' && searchIndexOptInKey.test(key)
        )
      : [];
  } catch {
    return [];
  }
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
      await readSearchIndexOptIns(guestWebContents)
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
    await clearWebviewStorageDeletingLoginData(
      guestWebContents,
      await readSearchIndexOptIns(guestWebContents)
    );
  });
};
