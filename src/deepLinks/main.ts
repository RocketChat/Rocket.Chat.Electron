import { URL } from 'url';

import { app, WebContents } from 'electron';

import { ServerUrlResolutionStatus } from '../servers/common';
import { resolveServerUrl } from '../servers/main';
import { select, dispatch } from '../store';
import {
  askForServerAddition,
  warnAboutInvalidServerUrl,
} from '../ui/main/dialogs';
import { getRootWindow } from '../ui/main/rootWindow';
import { getWebContentsByServerUrl } from '../ui/main/serverView';
import { DEEP_LINKS_SERVER_FOCUSED, DEEP_LINKS_SERVER_ADDED } from './actions';

const isRocketChatUrl = (parsedUrl: URL): boolean =>
  parsedUrl.protocol === 'rocketchat:';

const isGoRocketChatUrl = (parsedUrl: URL): boolean =>
  parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'go.rocket.chat';

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

  if (isRocketChatUrl(url)) {
    const action = url.hostname;
    const args = url.searchParams;
    return { action, args };
  }

  if (isGoRocketChatUrl(url)) {
    const action = url.pathname;
    const args = url.searchParams;
    return { action, args };
  }

  return null;
};

export let processDeepLinksInArgs = async (): Promise<void> => undefined;

type AuthenticationParams = {
  host: string;
  token: string;
  userId: string;
};

type OpenRoomParams = {
  host: string;
  path?: string;
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

const getWebContents = (serverUrl: string): Promise<WebContents> =>
  new Promise((resolve) => {
    const poll = (): void => {
      const webContents = getWebContentsByServerUrl(serverUrl);
      if (webContents) {
        resolve(webContents);
        return;
      }

      setTimeout(poll, 100);
    };

    poll();
  });

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
const performOpenRoom = async ({ host, path }: OpenRoomParams): Promise<void> =>
  performOnServer(host, async (serverUrl) => {
    if (!path) {
      return;
    }
    if (!/^\/?(direct|group|channel|livechat)\/[0-9a-zA-Z-_.]+/.test(path)) {
      return;
    }
    const webContents = await getWebContents(serverUrl);
    webContents.loadURL(new URL(path, serverUrl).href);
  });

const performInvite = async ({ host, path }: InviteParams): Promise<void> =>
  performOnServer(host, async (serverUrl) => {
    if (!/^invite\//.test(path)) {
      return;
    }
    const webContents = await getWebContents(serverUrl);
    webContents.loadURL(new URL(path, serverUrl).href);
  });

const processDeepLink = async (deepLink: string): Promise<void> => {
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
      if (host && path) {
        await performOpenRoom({ host, path });
      }
      break;
    }

    case 'invite': {
      const host = args.get('host') ?? undefined;
      const path = args.get('path') ?? undefined;
      if (host && path) {
        await performInvite({ host, path });
      }
    }
  }
};

export const setupDeepLinks = (): void => {
  app.addListener('open-url', async (event, url): Promise<void> => {
    event.preventDefault();

    const browserWindow = await getRootWindow();

    if (!browserWindow.isVisible()) {
      browserWindow.showInactive();
    }
    browserWindow.focus();

    await processDeepLink(url);
  });

  app.addListener('second-instance', async (event, argv): Promise<void> => {
    event.preventDefault();

    const browserWindow = await getRootWindow();

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
    const args = process.argv.slice(app.isPackaged ? 1 : 2);

    for (const arg of args) {
      // eslint-disable-next-line no-await-in-loop
      await processDeepLink(arg);
    }
  };
};
