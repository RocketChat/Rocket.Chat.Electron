import type { WebContents } from 'electron';

import { DEEP_LINKS_SERVER_FOCUSED } from '../deepLinks/actions';
import { select, dispatch, listen } from '../store';
import {
  TELEPHONY_SERVER_SELECT_OPEN,
  TELEPHONY_SERVER_SELECT_CLOSE,
} from '../ui/actions';
import { getWebContentsByServerUrl } from '../ui/main/serverView';
import { TELEPHONY_PREFERRED_SERVER_SET } from './actions';
import type { TelephonyLink } from './common';

const MODAL_TIMEOUT_MS = 120_000;
const WEB_CONTENTS_TIMEOUT_MS = 10_000;

let telephonyDialpadOpenInProgress = false;

const getTelephonyWebContents = (
  serverUrl: string,
  timeoutMs: number
): Promise<WebContents | null> =>
  new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    const poll = (): void => {
      const webContents = getWebContentsByServerUrl(serverUrl);
      if (webContents) {
        resolve(webContents);
        return;
      }

      if (Date.now() >= deadline) {
        resolve(null);
        return;
      }

      setTimeout(poll, 100);
    };

    poll();
  });

const selectTelephonyServerUrl = async (
  link: TelephonyLink
): Promise<string | null> => {
  const servers = select(({ servers }) => servers);

  if (servers.length === 0) {
    return null;
  }

  if (servers.length === 1) {
    return servers[0].url;
  }

  const preferredServer = select(
    ({ telephonyPreferredServer }) => telephonyPreferredServer
  );

  if (
    preferredServer &&
    servers.some((server) => server.url === preferredServer)
  ) {
    return preferredServer;
  }

  const result = await new Promise<{
    serverUrl: string;
    rememberChoice: boolean;
  } | null>((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      dispatch({ type: TELEPHONY_SERVER_SELECT_CLOSE, payload: null });
      resolve(null);
    }, MODAL_TIMEOUT_MS);

    const unsubscribe = listen(TELEPHONY_SERVER_SELECT_CLOSE, (action) => {
      clearTimeout(timeout);
      unsubscribe();
      resolve(action.payload);
    });

    dispatch({
      type: TELEPHONY_SERVER_SELECT_OPEN,
      payload: { phoneNumber: link.phoneNumber, rawUri: link.rawUri },
    });
  });

  if (!result) {
    return null;
  }

  if (result.rememberChoice) {
    dispatch({
      type: TELEPHONY_PREFERRED_SERVER_SET,
      payload: result.serverUrl,
    });
  }

  return result.serverUrl;
};

export const openTelephonyDialpad = async (
  link: TelephonyLink
): Promise<void> => {
  if (telephonyDialpadOpenInProgress) {
    return;
  }

  telephonyDialpadOpenInProgress = true;

  try {
    const serverUrl = await selectTelephonyServerUrl(link);
    if (!serverUrl) {
      return;
    }

    dispatch({ type: DEEP_LINKS_SERVER_FOCUSED, payload: serverUrl });

    const webContents = await getTelephonyWebContents(
      serverUrl,
      WEB_CONTENTS_TIMEOUT_MS
    );
    if (!webContents) {
      return;
    }

    if (webContents.isDestroyed()) {
      return;
    }

    webContents.send('telephony/call-requested', {
      phoneNumber: link.phoneNumber,
      rawUri: link.rawUri,
    });
  } finally {
    telephonyDialpadOpenInProgress = false;
  }
};
