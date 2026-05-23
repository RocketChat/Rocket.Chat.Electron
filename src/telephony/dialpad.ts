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
  // eslint-disable-next-line no-console
  console.error(
    '[MOSDAT-DIAG] selectTelephonyServerUrl: servers.length=',
    servers.length,
    'urls=',
    servers.map((s) => s.url)
  );

  if (servers.length === 0) {
    // eslint-disable-next-line no-console
    console.error(
      '[MOSDAT-DIAG] selectTelephonyServerUrl: returning null (no servers)'
    );
    return null;
  }

  if (servers.length === 1) {
    // eslint-disable-next-line no-console
    console.error(
      '[MOSDAT-DIAG] selectTelephonyServerUrl: single server short-circuit:',
      servers[0].url
    );
    return servers[0].url;
  }

  const preferredServer = select(
    ({ telephonyPreferredServer }) => telephonyPreferredServer
  );
  // eslint-disable-next-line no-console
  console.error(
    '[MOSDAT-DIAG] selectTelephonyServerUrl: preferredServer=',
    preferredServer
  );

  if (
    preferredServer &&
    servers.some((server) => server.url === preferredServer)
  ) {
    // eslint-disable-next-line no-console
    console.error(
      '[MOSDAT-DIAG] selectTelephonyServerUrl: using preferred:',
      preferredServer
    );
    return preferredServer;
  }

  // eslint-disable-next-line no-console
  console.error(
    '[MOSDAT-DIAG] selectTelephonyServerUrl: dispatching TELEPHONY_SERVER_SELECT_OPEN (picker)'
  );

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
      // eslint-disable-next-line no-console
      console.error(
        '[MOSDAT-DIAG] selectTelephonyServerUrl: SELECT_CLOSE received, payload=',
        JSON.stringify(action.payload)
      );
      resolve(action.payload);
    });

    dispatch({
      type: TELEPHONY_SERVER_SELECT_OPEN,
      payload: { phoneNumber: link.phoneNumber, rawUri: link.rawUri },
    });
    // eslint-disable-next-line no-console
    console.error(
      '[MOSDAT-DIAG] selectTelephonyServerUrl: SELECT_OPEN dispatched, awaiting CLOSE'
    );
  });
  // eslint-disable-next-line no-console
  console.error(
    '[MOSDAT-DIAG] selectTelephonyServerUrl: promise resolved, result=',
    JSON.stringify(result)
  );

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

    webContents.send('telephony/call-requested', {
      phoneNumber: link.phoneNumber,
      rawUri: link.rawUri,
    });
  } finally {
    telephonyDialpadOpenInProgress = false;
  }
};
