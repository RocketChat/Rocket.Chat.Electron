import { URL } from 'url';

import { app } from 'electron';

import * as deepLinksActions from '../common/actions/deepLinksActions';
import * as rootWindowActions from '../common/actions/rootWindowActions';
import { isGoRocketChatUrl } from '../common/helpers/isGoRocketChatUrl';
import { isNotUndefined } from '../common/helpers/isNotUndefined';
import { isRocketChatUrl } from '../common/helpers/isRocketChatUrl';
import { dispatch } from '../common/store';
import type { DeepLink } from '../common/types/DeepLink';

const isUrl = (arg: string) => {
  if (arg.charAt(0) === '-') {
    return false;
  }

  try {
    new URL(arg);
    return true;
  } catch (error) {
    return false;
  }
};

const toUrl = (arg: string) => new URL(arg);

const toDeepLinkParams = (arg: URL) => {
  if (isRocketChatUrl(arg)) {
    const action = arg.hostname;
    const args = arg.searchParams;
    return { action, args };
  }

  if (isGoRocketChatUrl(arg)) {
    const action = arg.pathname;
    const args = arg.searchParams;
    return { action, args };
  }

  return undefined;
};

const toAuthLink = (args: URLSearchParams) => {
  const host = args.get('host') ?? undefined;
  const token = args.get('token') ?? undefined;
  const userId = args.get('userId') ?? undefined;

  if (host === undefined || token === undefined || userId === undefined) {
    return undefined;
  }

  return {
    type: 'auth' as const,
    host,
    token,
    userId,
  };
};

const toRoomLink = (args: URLSearchParams) => {
  const host = args.get('host') ?? undefined;
  const path = args.get('path') ?? undefined;
  const rid = args.get('rid') ?? undefined;

  if (host === undefined || rid === undefined) {
    return undefined;
  }

  return {
    type: 'room' as const,
    host,
    path,
    rid,
  };
};

const toInviteLink = (args: URLSearchParams) => {
  const host = args.get('host') ?? undefined;
  const path = args.get('path') ?? undefined;
  const rid = args.get('rid') ?? undefined;

  if (host === undefined || path === undefined || rid === undefined) {
    return undefined;
  }

  return {
    type: 'invite' as const,
    host,
    path,
    rid,
  };
};

const toDeepLink = (
  arg: { action: string; args: URLSearchParams } | undefined
) => {
  if (arg === undefined) {
    return undefined;
  }

  console.log(arg);

  const { action, args } = arg;

  switch (action) {
    case 'auth':
      return toAuthLink(args);

    case 'room':
      return toRoomLink(args);

    case 'invite':
      return toInviteLink(args);
  }

  return undefined;
};

const mapDeepLinks = (args: string[]): DeepLink[] =>
  args
    .filter(isUrl)
    .map(toUrl)
    .map(toDeepLinkParams)
    .map(toDeepLink)
    .filter(isNotUndefined);

const fromArgv = (argv: string[]): string[] =>
  argv.slice(app.isPackaged ? 1 : 2);

const processDeepLinks = (args: string[]): void => {
  const deepLinks = mapDeepLinks(args);

  if (deepLinks.length === 0) {
    return;
  }

  dispatch(deepLinksActions.triggered(deepLinks));
};

export const attachDeepLinkEvents = (): void => {
  app.addListener('open-url', async (event, url): Promise<void> => {
    event.preventDefault();

    processDeepLinks([url]);
  });

  app.addListener('second-instance', async (event, argv): Promise<void> => {
    event.preventDefault();

    dispatch(rootWindowActions.focused());
    processDeepLinks(fromArgv(argv));
  });
};

export const processDeepLinksInArgv = (argv: string[]): void => {
  processDeepLinks(fromArgv(argv));
};
