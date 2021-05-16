import { createReducer } from '@reduxjs/toolkit';

import type { ActionOf } from '../actions';
import { DEEP_LINKS_SERVER_ADDED } from '../actions/deepLinksActions';
import * as serverActions from '../actions/serverActions';
import {
  ADD_SERVER_VIEW_SERVER_ADDED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  SIDE_BAR_SERVERS_SORTED,
  WEBVIEW_DID_NAVIGATE,
  WEBVIEW_SIDEBAR_STYLE_CHANGED,
  WEBVIEW_TITLE_CHANGED,
  WEBVIEW_FAVICON_CHANGED,
  WEBVIEW_DID_START_LOADING,
  WEBVIEW_DID_FAIL_LOAD,
  WEBVIEW_ATTACHED,
} from '../actions/uiActions';
import type { Server } from '../types/Server';

const findServer = (
  servers: Server[],
  url: Server['url']
): Server | undefined => servers.find((server) => server.url === url);

const upsert = (state: Server[], server: Server): Server[] => {
  const index = state.findIndex(({ url }) => url === server.url);

  if (index === -1) {
    return [...state, server];
  }

  return state.map((_server, i) =>
    i === index ? { ..._server, ...server } : _server
  );
};

const update = (state: Server[], server: Server): Server[] => {
  const index = state.findIndex(({ url }) => url === server.url);

  if (index === -1) {
    return state;
  }

  return state.map((_server, i) =>
    i === index ? { ..._server, ...server } : _server
  );
};

export const servers = createReducer<Server[]>([], (builder) =>
  builder
    .addCase(
      ADD_SERVER_VIEW_SERVER_ADDED,
      (state, action: ActionOf<typeof ADD_SERVER_VIEW_SERVER_ADDED>) => {
        const url = action.payload;
        return upsert(state, { url, title: url });
      }
    )
    .addCase(
      DEEP_LINKS_SERVER_ADDED,
      (state, action: ActionOf<typeof DEEP_LINKS_SERVER_ADDED>) => {
        const url = action.payload;
        return upsert(state, { url, title: url });
      }
    )
    .addCase(
      SIDE_BAR_REMOVE_SERVER_CLICKED,
      (state, action: ActionOf<typeof SIDE_BAR_REMOVE_SERVER_CLICKED>) => {
        const url = action.payload;
        return state.filter((server) => server.url !== url);
      }
    )
    .addCase(
      SIDE_BAR_SERVERS_SORTED,
      (state, action: ActionOf<typeof SIDE_BAR_SERVERS_SORTED>) => {
        const urls = action.payload;
        return state.sort(
          ({ url: a }, { url: b }) => urls.indexOf(a) - urls.indexOf(b)
        );
      }
    )
    .addCase(
      WEBVIEW_TITLE_CHANGED,
      (state, action: ActionOf<typeof WEBVIEW_TITLE_CHANGED>) => {
        const { url, title = url } = action.payload;
        return upsert(state, { url, title });
      }
    )
    .addCase(
      WEBVIEW_SIDEBAR_STYLE_CHANGED,
      (state, action: ActionOf<typeof WEBVIEW_SIDEBAR_STYLE_CHANGED>) => {
        const { url, style } = action.payload;
        return upsert(state, { url, style });
      }
    )
    .addCase(
      WEBVIEW_FAVICON_CHANGED,
      (state, action: ActionOf<typeof WEBVIEW_FAVICON_CHANGED>) => {
        const { url, favicon } = action.payload;
        return upsert(state, { url, favicon });
      }
    )
    .addCase(
      WEBVIEW_DID_NAVIGATE,
      (state, action: ActionOf<typeof WEBVIEW_DID_NAVIGATE>) => {
        const { url, pageUrl } = action.payload;
        if (pageUrl?.includes(url)) {
          return upsert(state, { url, lastPath: pageUrl });
        }

        return state;
      }
    )
    .addCase(
      WEBVIEW_DID_START_LOADING,
      (state, action: ActionOf<typeof WEBVIEW_DID_START_LOADING>) => {
        const { url } = action.payload;
        return upsert(state, { url, failed: false });
      }
    )
    .addCase(
      WEBVIEW_DID_FAIL_LOAD,
      (state, action: ActionOf<typeof WEBVIEW_DID_FAIL_LOAD>) => {
        const { url, isMainFrame } = action.payload;
        if (isMainFrame) {
          return upsert(state, { url, failed: true });
        }

        return state;
      }
    )
    .addCase(
      WEBVIEW_ATTACHED,
      (state, action: ActionOf<typeof WEBVIEW_ATTACHED>) => {
        const { url, webContentsId } = action.payload;
        return update(state, { url, webContentsId });
      }
    )
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
);
