import { createReducer } from '@reduxjs/toolkit';

import * as serverActions from '../actions/serverActions';
import * as serversActions from '../actions/serversActions';
import type { Server } from '../types/Server';

const findServer = (
  servers: Server[],
  url: Server['url']
): Server | undefined => servers.find((server) => server.url === url);

const findServerIndex = (servers: Server[], url: Server['url']): number =>
  servers.findIndex((server) => server.url === url);

export const serversReducer = createReducer<Server[]>([], (builder) =>
  builder
    .addCase(serverActions.loading, (state, action) => {
      const { url } = action.payload;
      const server = findServer(state, url);
      if (server) {
        server.failed = false;
      }
    })
    .addCase(serverActions.failedToLoad, (state, action) => {
      const { url } = action.payload;
      const server = findServer(state, url);
      if (server) {
        server.failed = true;
      }
    })
    .addCase(serverActions.pathChanged, (state, action) => {
      const { url, path } = action.payload;
      const server = findServer(state, url);
      if (server) {
        server.lastPath = new URL(path, url).href;
      }
    })
    .addCase(serverActions.versionChanged, (state, action) => {
      const { url, version } = action.payload;
      const server = findServer(state, url);
      if (server) {
        server.version = version;
      }
    })
    .addCase(serverActions.badgeChanged, (state, action) => {
      const { url, badge } = action.payload;
      const server = findServer(state, url);
      if (server) {
        server.badge = badge;
      }
    })
    .addCase(serverActions.faviconChanged, (state, action) => {
      const { url, favicon } = action.payload;
      const server = findServer(state, url);
      if (server) {
        server.favicon = favicon;
      }
    })
    .addCase(serverActions.styleChanged, (state, action) => {
      const { url, style } = action.payload;
      const server = findServer(state, url);
      if (server) {
        server.style = style;
      }
    })
    .addCase(serverActions.titleChanged, (state, action) => {
      const { url, title = url } = action.payload;
      const server = findServer(state, url);
      if (server) {
        server.title = title;
      }
    })
    .addCase(serverActions.userPresenceParamsChanged, (state, action) => {
      const { url, presence } = action.payload;
      const server = findServer(state, url);

      if (server) {
        server.presence = presence.autoAwayEnabled
          ? {
              idleState: 'unknown',
              ...presence,
            }
          : presence;
      }
    })
    .addCase(serverActions.idleStateChanged, (state, action) => {
      const { url, idleState } = action.payload;
      const server = findServer(state, url);

      if (server?.presence?.autoAwayEnabled) {
        server.presence.idleState = idleState;
      }
    })
    .addCase(serverActions.webviewAttached, (state, action) => {
      const { url, webContentsId } = action.payload;
      const server = findServer(state, url);
      if (server) {
        server.webContentsId = webContentsId;
      }
    })
    .addCase(serverActions.added, (state, action) => {
      const { url } = action.payload;
      const server = findServer(state, url);

      if (!server) {
        state.push({ url });
      }
    })
    .addCase(serverActions.removed, (state, action) => {
      const { url } = action.payload;
      const index = findServerIndex(state, url);

      if (index >= 0) {
        state.splice(index, 1);
      }
    })
    .addCase(serversActions.sorted, (state, action) => {
      const { urls } = action.payload;
      state.sort(({ url: a }, { url: b }) => urls.indexOf(a) - urls.indexOf(b));
    })
);
