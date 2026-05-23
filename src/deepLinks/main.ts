import type { WebContents } from 'electron';
import { app } from 'electron';

import {
  electronBuilderJsonInformation,
  packageJsonInformation,
} from '../app/main/app';
import { ServerUrlResolutionStatus } from '../servers/common';
import { resolveServerUrl } from '../servers/main';
import { select, dispatch } from '../store';
import { openTelephonyDialpad } from '../telephony/dialpad';
import { parseTelephonyLink } from '../telephony/links';
import {
  askForServerAddition,
  warnAboutInvalidServerUrl,
} from '../ui/main/dialogs';
import { getRootWindow } from '../ui/main/rootWindow';
import { getWebContentsByServerUrl } from '../ui/main/serverView';
import { DEEP_LINKS_SERVER_FOCUSED, DEEP_LINKS_SERVER_ADDED } from './actions';

export type { TelephonyLink } from '../telephony/common';
export { openTelephonyDialpad as performTelephonyCall } from '../telephony/dialpad';
export { parseTelephonyLink } from '../telephony/links';

const pendingOpenUrls: string[] = [];
let isOpenUrlProcessingReady = false;

const isDefinedProtocol = (parsedUrl: URL): boolean =>
  parsedUrl.protocol === `${electronBuilderJsonInformation.protocol}:`;

const isGoUrlShortener = (parsedUrl: URL): boolean =>
  parsedUrl.protocol === 'https:' &&
  parsedUrl.hostname === packageJsonInformation.goUrlShortener;

const parseDeepLink = (
  input: string
): { action: string; args: URLSearchParams } | null => {
  if (/^--/.test(input)) {
    // input is a CLI flag
    return null;
  }

  let url: URL;

  try {
    url = new URL(input);
  } catch (error) {
    return null;
  }

  if (isDefinedProtocol(url)) {
    const action = url.hostname;
    const args = url.searchParams;
    return { action, args };
  }

  if (isGoUrlShortener(url)) {
    const action = url.pathname;
    const args = url.searchParams;
    return { action, args };
  }

  return null;
};

export let processDeepLinksInArgs = async (): Promise<void> => undefined;

const focusRootWindow = async (): Promise<void> => {
  const browserWindow = await getRootWindow();

  if (!browserWindow.isVisible()) {
    browserWindow.showInactive();
  }
  browserWindow.focus();
};

type AuthenticationParams = {
  host: string;
  token: string;
  userId: string;
};

type OpenRoomParams = {
  host: string;
  path?: string;
  token?: string;
  userId?: string;
};

type InviteParams = {
  host: string;
  path: string;
};

const performOnServer = async (
  url: string,
  action: (serverUrl: string) => Promise<void>
): Promise<void> => {
  const [serverUrl, status, error] = await resolveServerUrl(url);

  if (status !== ServerUrlResolutionStatus.OK) {
    await warnAboutInvalidServerUrl(serverUrl, error?.message ?? '');
    return;
  }

  const isServerAdded = select(({ servers }) =>
    servers.some((server) => server.url === serverUrl)
  );

  if (isServerAdded) {
    dispatch({ type: DEEP_LINKS_SERVER_FOCUSED, payload: serverUrl });
    await action(serverUrl);
    return;
  }

  const permitted = await askForServerAddition(serverUrl);

  if (!permitted) {
    return;
  }

  dispatch({
    type: DEEP_LINKS_SERVER_ADDED,
    payload: serverUrl,
  });
  await action(serverUrl);
};

function getWebContents(serverUrl: string): Promise<WebContents>;
function getWebContents(
  serverUrl: string,
  timeoutMs: number
): Promise<WebContents | null>;
function getWebContents(
  serverUrl: string,
  timeoutMs?: number
): Promise<WebContents | null> {
  return new Promise((resolve) => {
    const deadline =
      timeoutMs !== undefined ? Date.now() + timeoutMs : undefined;

    const poll = (): void => {
      const webContents = getWebContentsByServerUrl(serverUrl);
      if (webContents) {
        resolve(webContents);
        return;
      }

      if (deadline !== undefined && Date.now() >= deadline) {
        resolve(null);
        return;
      }

      setTimeout(poll, 100);
    };

    poll();
  });
}

const performAuthentication = async ({
  host,
  token,
  userId,
}: AuthenticationParams): Promise<void> =>
  performOnServer(host, async (serverUrl) => {
    const url = new URL('home', serverUrl);
    url.searchParams.append('resumeToken', token);
    url.searchParams.append('userId', userId);

    const webContents = await getWebContents(serverUrl);
    webContents.loadURL(url.href);
  });

// https://developer.rocket.chat/rocket.chat/deeplink#channel-group-dm
const performOpenRoom = async ({
  host,
  path,
  token,
  userId,
}: OpenRoomParams): Promise<void> =>
  performOnServer(host, async (serverUrl) => {
    if (!path) {
      return;
    }
    if (!/^\/?(direct|group|channel|livechat)\/[0-9a-zA-Z-_.]+/.test(path)) {
      return;
    }
    const url = new URL(path, serverUrl);
    if (token && userId) {
      url.searchParams.append('resumeToken', token);
      url.searchParams.append('userId', userId);
    }

    const webContents = await getWebContents(serverUrl);
    webContents.loadURL(url.href);
  });

const performInvite = async ({ host, path }: InviteParams): Promise<void> =>
  performOnServer(host, async (serverUrl) => {
    if (!/^invite\//.test(path)) {
      return;
    }
    const webContents = await getWebContents(serverUrl);
    webContents.loadURL(new URL(path, serverUrl).href);
  });

const performConference = async ({ host, path }: InviteParams): Promise<void> =>
  performOnServer(host, async (serverUrl) => {
    if (!/^conference\//.test(path)) {
      return;
    }
    const webContents = await getWebContents(serverUrl);
    webContents.loadURL(new URL(path, serverUrl).href);
  });

const processDeepLink = async (deepLink: string): Promise<void> => {
  console.error('[MOSDAT-DIAG] processDeepLink called:', deepLink);
  const telephonyLink = parseTelephonyLink(deepLink);
  console.error('[MOSDAT-DIAG] parseTelephonyLink result:', telephonyLink);
  if (telephonyLink) {
    const isTelephonyEnabled = select(
      ({ isTelephonyEnabled }) => isTelephonyEnabled
    );
    console.error('[MOSDAT-DIAG] isTelephonyEnabled:', isTelephonyEnabled);
    if (!isTelephonyEnabled) {
      console.error('[MOSDAT-DIAG] RETURNING - telephony disabled');
      return;
    }
    console.error('[MOSDAT-DIAG] calling openTelephonyDialpad');
    try {
      await openTelephonyDialpad(telephonyLink);
      console.error('[MOSDAT-DIAG] openTelephonyDialpad completed');
    } catch (e) {
      console.error('[MOSDAT-DIAG] openTelephonyDialpad threw:', e);
      throw e;
    }
    return;
  }

  const parsedDeepLink = parseDeepLink(deepLink);

  if (!parsedDeepLink) {
    return;
  }

  const { action, args } = parsedDeepLink;

  switch (action) {
    case 'auth': {
      const host = args.get('host') ?? undefined;
      const token = args.get('token') ?? undefined;
      const userId = args.get('userId') ?? undefined;
      if (host && token && userId) {
        await performAuthentication({ host, token, userId });
      }
      break;
    }

    case 'room': {
      const host = args.get('host') ?? undefined;
      const path = args.get('path') ?? undefined;
      const token = args.get('token') ?? undefined;
      const userId = args.get('userId') ?? undefined;
      if (host && path) {
        await performOpenRoom({ host, path, token, userId });
      }
      break;
    }

    case 'invite': {
      const host = args.get('host') ?? undefined;
      const path = args.get('path') ?? undefined;
      if (host && path) {
        await performInvite({ host, path });
      }
      break;
    }

    case 'conference': {
      const host = args.get('host') ?? undefined;
      const path = args.get('path') ?? undefined;
      if (host && path) {
        await performConference({ host, path });
      }
      break;
    }
  }
};

export const setupDeepLinks = (): void => {
  pendingOpenUrls.length = 0;
  isOpenUrlProcessingReady = false;

  app.addListener('open-url', async (event, url): Promise<void> => {
    event.preventDefault();

    if (!isOpenUrlProcessingReady) {
      pendingOpenUrls.push(url);
      return;
    }

    await focusRootWindow();
    await processDeepLink(url);
  });

  const processQueuedOpenUrls = async (): Promise<void> => {
    const urls = pendingOpenUrls.splice(0);

    for (const url of urls) {
      // eslint-disable-next-line no-await-in-loop
      await focusRootWindow();
      // eslint-disable-next-line no-await-in-loop
      await processDeepLink(url);
    }
  };

  app.addListener('second-instance', async (event, argv): Promise<void> => {
    console.error(
      '[MOSDAT-DIAG] second-instance event, argv:',
      JSON.stringify(argv)
    );
    event.preventDefault();

    const browserWindow = await getRootWindow();
    const browserWindowDestroyed =
      typeof browserWindow?.isDestroyed === 'function'
        ? browserWindow.isDestroyed()
        : undefined;
    const webContentsDestroyed =
      typeof browserWindow?.webContents?.isDestroyed === 'function'
        ? browserWindow.webContents.isDestroyed()
        : undefined;
    // eslint-disable-next-line no-console
    console.error(
      '[MOSDAT-DIAG] rootWindow exists:',
      !!browserWindow,
      'isVisible:',
      browserWindow?.isVisible(),
      'isDestroyed:',
      browserWindowDestroyed,
      'wcId:',
      browserWindow?.webContents?.id,
      'wcDestroyed:',
      webContentsDestroyed
    );

    if (browserWindow && !browserWindow.isVisible()) {
      browserWindow.showInactive();
    }
    if (browserWindow) browserWindow.focus();

    const args = argv.slice(app.isPackaged ? 1 : 2);

    for (const arg of args) {
      // eslint-disable-next-line no-await-in-loop
      await processDeepLink(arg);
    }
  });

  processDeepLinksInArgs = async (): Promise<void> => {
    isOpenUrlProcessingReady = true;

    await processQueuedOpenUrls();

    const args = process.argv.slice(app.isPackaged ? 1 : 2);

    for (const arg of args) {
      // eslint-disable-next-line no-await-in-loop
      await processDeepLink(arg);
    }
  };
};
