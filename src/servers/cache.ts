import { webContents, type WebContents } from 'electron';

import { dispatch, listen, select } from '../store';
import {
  CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED,
  CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED,
} from '../ui/actions';
import { SERVER_WEBVIEW_RECREATE_REQUESTED } from './actions';

const getServerUrlFromWebContents = (
  guestWebContents: WebContents
): string | undefined => {
  const { id } = guestWebContents;
  const servers = select(({ servers }) => servers);
  return servers.find((s) => s.webContentsId === id)?.url;
};

const requestWebviewRecreate = (url: string): void => {
  dispatch({
    type: SERVER_WEBVIEW_RECREATE_REQUESTED,
    payload: { url },
  });
};

export const clearWebviewStorageKeepingLoginData = async (
  guestWebContents: WebContents
) => {
  if (!guestWebContents) return;
  await guestWebContents.session.clearCache();
  await guestWebContents.session.clearStorageData({
    storages: ['indexdb', 'serviceworkers', 'cachestorage'],
  });
  const url = getServerUrlFromWebContents(guestWebContents);
  if (url) {
    requestWebviewRecreate(url);
    return;
  }
  guestWebContents.reloadIgnoringCache();
};

export const clearWebviewStorageDeletingLoginData = async (
  guestWebContents: WebContents
) => {
  if (!guestWebContents) return;
  await guestWebContents.session.clearCache();
  await guestWebContents.session.clearStorageData();
  const url = getServerUrlFromWebContents(guestWebContents);
  if (url) {
    requestWebviewRecreate(url);
    return;
  }
  guestWebContents.reloadIgnoringCache();
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
