import { URL } from 'url';

import { app } from 'electron';

import { normalizeServerUrl, validateServer } from '../servers/main';
import { select, dispatch } from '../store';
import { askForServerAddition, warnAboutInvalidServerUrl } from '../ui/main/dialogs';
import { getRootWindow } from '../ui/main/rootWindow';
import {
  DEEP_LINKS_SERVER_FOCUSED,
  DEEP_LINKS_SERVER_ADDED,
} from './actions';

const isRocketChatUrl = (parsedUrl: URL): boolean =>
  parsedUrl.protocol === 'rocketchat:';

const isGoRocketChatUrl = (parsedUrl: URL): boolean =>
  parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'go.rocket.chat';

const parseDeepLink = (deepLink: string): { action: string, args: URLSearchParams } => {
  const parsedUrl = new URL(deepLink);

  if (isRocketChatUrl(parsedUrl)) {
    const action = parsedUrl.hostname;
    const args = parsedUrl.searchParams;
    return { action, args };
  }

  if (isGoRocketChatUrl(parsedUrl)) {
    const action = parsedUrl.pathname;
    const args = parsedUrl.searchParams;
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
  rid: string;
  path: string;
}

const performOnServer = async (url: string, action: (serverUrl: string) => Promise<void>): Promise<void> => {
  const serverUrl = normalizeServerUrl(url);
  if (!serverUrl) {
    return;
  }

  const isServerAdded = select(({ servers }) => servers.some((server) => server.url === serverUrl));

  if (isServerAdded) {
    dispatch({ type: DEEP_LINKS_SERVER_FOCUSED, payload: serverUrl });
    await action(serverUrl);
    return;
  }

  const permitted = await askForServerAddition(serverUrl);

  if (!permitted) {
    return;
  }

  try {
    await validateServer(serverUrl);
  } catch (error) {
    await warnAboutInvalidServerUrl(serverUrl, error.message);
    return;
  }

  dispatch({ type: DEEP_LINKS_SERVER_ADDED, payload: serverUrl });
  await action(serverUrl);
};

const authenticateFromDeepLink = (_token: string, _userId: string): Promise<void> => {
  throw Error('not implemented');
};

const performAuthentication = async ({ host, token, userId }: AuthenticationParams): Promise<void> =>
  performOnServer(host, () => authenticateFromDeepLink(token, userId));

const requestOpenRoom = (_rid: string, _path: string): Promise<void> => {
  throw Error('not implemented');
};

const performOpenRoom = async ({ host, rid, path }: OpenRoomParams): Promise<void> =>
  performOnServer(host, () => requestOpenRoom(rid, path));

export const setupDeepLinks = (): void => {
  const processDeepLink = async (deepLink: string): Promise<void> => {
    const parsedDeepLink = parseDeepLink(deepLink);

    if (!parsedDeepLink) {
      return;
    }

    const { action, args } = parsedDeepLink;

    switch (action) {
      case 'auth': {
        const host = args.get('host');
        const token = args.get('token');
        const userId = args.get('userId');
        await performAuthentication({ host, token, userId });
        break;
      }

      case 'room': {
        const host = args.get('host');
        const path = args.get('path');
        const rid = args.get('rid');
        await performOpenRoom({ host, path, rid });
        break;
      }
    }
  };

  app.addListener('open-url', async (event, url): Promise<void> => {
    event.preventDefault();

    getRootWindow().show();

    await processDeepLink(url);
  });

  app.addListener('second-instance', async (event, argv): Promise<void> => {
    event.preventDefault();

    getRootWindow().show();

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
