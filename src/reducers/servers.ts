import { Reducer } from 'redux';

import {
  ADD_SERVER_VIEW_SERVER_ADDED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  SIDE_BAR_SERVERS_SORTED,
  WEBVIEW_DID_NAVIGATE,
  WEBVIEW_SIDEBAR_STYLE_CHANGED,
  WEBVIEW_TITLE_CHANGED,
  WEBVIEW_UNREAD_CHANGED,
  WEBVIEW_FAVICON_CHANGED,
  PERSISTABLE_VALUES_MERGED,
  WEBVIEW_DID_START_LOADING,
  WEBVIEW_DID_FAIL_LOAD,
  ActionOf,
} from '../actions';
import { Server } from '../structs/servers';

type ServersActionTypes = (
  ActionOf<typeof ADD_SERVER_VIEW_SERVER_ADDED>
  | ActionOf<typeof SIDE_BAR_REMOVE_SERVER_CLICKED>
  | ActionOf<typeof SIDE_BAR_SERVERS_SORTED>
  | ActionOf<typeof WEBVIEW_DID_NAVIGATE>
  | ActionOf<typeof WEBVIEW_SIDEBAR_STYLE_CHANGED>
  | ActionOf<typeof WEBVIEW_TITLE_CHANGED>
  | ActionOf<typeof WEBVIEW_UNREAD_CHANGED>
  | ActionOf<typeof WEBVIEW_FAVICON_CHANGED>
  | ActionOf<typeof PERSISTABLE_VALUES_MERGED>
  | ActionOf<typeof WEBVIEW_DID_START_LOADING>
  | ActionOf<typeof WEBVIEW_DID_FAIL_LOAD>
);


const upsert = (state: Server[], server: Server): Server[] => {
  const index = state.findIndex(({ url }) => url === server.url);

  if (index === -1) {
    return [...state, server];
  }

  return state.map((_server, i) => (i === index ? { ..._server, ...server } : _server));
};

export const servers: Reducer<Server[], ServersActionTypes> = (state = [], action) => {
  switch (action.type) {
    case ADD_SERVER_VIEW_SERVER_ADDED: {
      const url = action.payload;
      return upsert(state, { url, title: url });
    }

    case SIDE_BAR_REMOVE_SERVER_CLICKED: {
      const _url = action.payload;
      return state.filter(({ url }) => url !== _url);
    }

    case SIDE_BAR_SERVERS_SORTED: {
      const urls = action.payload;
      return state.sort(({ url: a }, { url: b }) => urls.indexOf(a) - urls.indexOf(b));
    }

    case WEBVIEW_TITLE_CHANGED: {
      const { url, title = url } = action.payload;
      return upsert(state, { url, title });
    }

    case WEBVIEW_UNREAD_CHANGED: {
      const { url, badge } = action.payload;
      return upsert(state, { url, badge });
    }

    case WEBVIEW_SIDEBAR_STYLE_CHANGED: {
      const { url, style } = action.payload;
      return upsert(state, { url, style });
    }

    case WEBVIEW_FAVICON_CHANGED: {
      const { url, favicon } = action.payload;
      return upsert(state, { url, favicon });
    }

    case WEBVIEW_DID_NAVIGATE: {
      const { url, pageUrl } = action.payload;
      if (pageUrl.includes(url)) {
        return upsert(state, { url, lastPath: pageUrl });
      }

      return state;
    }

    case WEBVIEW_DID_START_LOADING: {
      const { url } = action.payload;
      return upsert(state, { url, failed: false });
    }

    case WEBVIEW_DID_FAIL_LOAD: {
      const { url, isMainFrame } = action.payload;
      if (isMainFrame) {
        return upsert(state, { url, failed: true });
      }

      return state;
    }

    case PERSISTABLE_VALUES_MERGED: {
      const { servers = state } = action.payload;
      return servers;
    }
  }

  return state;
};
