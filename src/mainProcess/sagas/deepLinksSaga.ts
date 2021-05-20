import { webContents, WebContents } from 'electron';
import { StrictEffect, takeEvery } from 'redux-saga/effects';

import * as deepLinksActions from '../../common/actions/deepLinksActions';
import * as rootWindowActions from '../../common/actions/rootWindowActions';
import * as serverActions from '../../common/actions/serverActions';
import * as viewActions from '../../common/actions/viewActions';
import { call } from '../../common/effects/call';
import { put } from '../../common/effects/put';
import { select } from '../../common/effects/select';
import { take } from '../../common/effects/take';
import type { AuthenticationDeepLink } from '../../common/types/AuthenticationDeepLink';
import type { InviteDeepLink } from '../../common/types/InviteDeepLink';
import type { OpenRoomDeepLink } from '../../common/types/OpenRoomDeepLink';
import type { Server } from '../../common/types/Server';
import { ServerUrlResolutionStatus } from '../../common/types/ServerUrlResolutionStatus';
import { attachDeepLinkEvents, processDeepLinksInArgv } from '../deepLinks';
import { askForServerAddition, warnAboutInvalidServerUrl } from '../dialogs';
import { resolveServerUrl } from '../resolveServerUrl';

function* getServerUrlFromHost(
  host: string
): Generator<StrictEffect, Server['url'] | undefined> {
  const [url, status, error] = yield* call(resolveServerUrl, host);

  if (status !== ServerUrlResolutionStatus.OK) {
    yield* call(warnAboutInvalidServerUrl, url, error?.message ?? '');
    return undefined;
  }

  const serverAdded = yield* select((state) =>
    state.servers.some((server) => server.url === url)
  );

  if (!serverAdded) {
    const permitted = yield* call(askForServerAddition, url);

    if (!permitted) {
      return undefined;
    }

    yield* put(serverActions.added(url));
  }

  yield* put(viewActions.changed({ url }));

  return url;
}

function* getWebContents(
  url: Server['url']
): Generator<StrictEffect, WebContents> {
  let webContentsId: number | undefined = undefined;
  do {
    webContentsId = yield* select(
      (state) =>
        state.servers.find((server) => server.url === url)?.webContentsId
    );

    if (webContentsId === undefined) {
      yield* take();
    }
  } while (webContentsId === undefined);
  return webContents.fromId(webContentsId);
}

function* performAuthentication({
  host,
  token,
  userId,
}: AuthenticationDeepLink): Generator<StrictEffect, void> {
  const url = yield* getServerUrlFromHost(host);
  if (!url) {
    return;
  }

  const pageUrl = new URL('home', url);
  pageUrl.searchParams.append('resumeToken', token);
  pageUrl.searchParams.append('userId', userId);

  const webContents = yield* getWebContents(url);
  webContents.loadURL(pageUrl.href);
}

function* performOpenRoom({
  host,
  path,
}: OpenRoomDeepLink): Generator<StrictEffect, void> {
  const url = yield* getServerUrlFromHost(host);
  if (!url) {
    return;
  }

  if (!path) {
    return;
  }

  const pageUrl = new URL(path, url);

  const webContents = yield* getWebContents(url);
  webContents.loadURL(pageUrl.href);
}

function* performInvite({
  host,
  path,
}: InviteDeepLink): Generator<StrictEffect, void> {
  const url = yield* getServerUrlFromHost(host);
  if (!url) {
    return;
  }

  if (!/^invite\//.test(path)) {
    return;
  }

  const pageUrl = new URL(path, url);

  const webContents = yield* getWebContents(url);
  webContents.loadURL(pageUrl.href);
}

export function* deepLinksSaga(): Generator {
  yield takeEvery(deepLinksActions.triggered.match, function* (action) {
    yield* put(rootWindowActions.focused());

    const { deepLinks } = action.payload;

    for (const deepLink of deepLinks) {
      switch (deepLink.type) {
        case 'auth':
          yield* performAuthentication(deepLink);
          break;

        case 'room':
          yield* performOpenRoom(deepLink);
          break;

        case 'invite':
          yield* performInvite(deepLink);
          break;
      }
    }
  });

  yield* call(attachDeepLinkEvents);
  yield* call(processDeepLinksInArgv, process.argv);
}
