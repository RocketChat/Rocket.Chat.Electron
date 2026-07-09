import { webContents, type WebContents } from 'electron';

import { listen } from '../store';
import {
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
      'websql',
      'serviceworkers',
      'cachestorage',
    ],
  });
  guestWebContents?.reloadIgnoringCache();
};

export const clearWebviewStorageDeletingLoginData = async (
  guestWebContents: WebContents
) => {
  if (!guestWebContents) return;
  await guestWebContents.session.clearCache();
  await guestWebContents.session.clearStorageData();
  guestWebContents?.reloadIgnoringCache();
};

export const handleClearCacheDialog = () => {
  listen(CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED, async (action) => {
    const guestWebContents = webContents.fromId(action.payload);
    if (!guestWebContents) {
      return;
    }
    await clearWebviewStorageKeepingLoginData(guestWebContents);
  });

  listen(CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED, async (action) => {
    const guestWebContents = webContents.fromId(action.payload);
    if (!guestWebContents) {
      return;
    }
    await clearWebviewStorageDeletingLoginData(guestWebContents);
  });
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
    await clearWebviewStorageDeletingLoginData(guestWebContents);
  });
};
