/* eslint-disable complexity */
import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../app/actions';
import { DEEP_LINKS_SERVER_ADDED } from '../deepLinks/actions';
import { OUTLOOK_CALENDAR_SAVE_CREDENTIALS } from '../outlookCalendar/actions';
import type { ActionOf } from '../store/actions';
import type { SIDE_BAR_SERVER_REMOVE } from '../ui/actions';
import {
  WEBVIEW_PAGE_TITLE_CHANGED,
  ADD_SERVER_VIEW_SERVER_ADDED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  SIDE_BAR_SERVERS_SORTED,
  WEBVIEW_DID_NAVIGATE,
  WEBVIEW_SIDEBAR_STYLE_CHANGED,
  WEBVIEW_TITLE_CHANGED,
  WEBVIEW_UNREAD_CHANGED,
  WEBVIEW_USER_LOGGED_IN,
  WEBVIEW_FAVICON_CHANGED,
  WEBVIEW_DID_START_LOADING,
  WEBVIEW_DID_FAIL_LOAD,
  WEBVIEW_READY,
  WEBVIEW_ATTACHED,
  WEBVIEW_GIT_COMMIT_HASH_CHANGED,
  WEBVIEW_ALLOWED_REDIRECTS_CHANGED,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
  WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
  WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
  WEBVIEW_SERVER_VERSION_UPDATED,
  SUPPORTED_VERSION_DIALOG_DISMISS,
  WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED,
  WEBVIEW_USER_THEME_APPEARANCE_CHANGED,
} from '../ui/actions';
import { SERVERS_LOADED, SERVER_DOCUMENT_VIEWER_OPEN_URL } from './actions';
import type { Server } from './common';

const ensureUrlFormat = (serverUrl: string | null): string => {
  if (serverUrl) {
    return new URL(serverUrl).href;
  }

  throw new Error('cannot handle null server URLs');
};

type ServersActionTypes =
  | ActionOf<typeof ADD_SERVER_VIEW_SERVER_ADDED>
  | ActionOf<typeof DEEP_LINKS_SERVER_ADDED>
  | ActionOf<typeof SERVERS_LOADED>
  | ActionOf<typeof SIDE_BAR_REMOVE_SERVER_CLICKED>
  | ActionOf<typeof SIDE_BAR_SERVERS_SORTED>
  | ActionOf<typeof WEBVIEW_DID_NAVIGATE>
  | ActionOf<typeof WEBVIEW_SIDEBAR_STYLE_CHANGED>
  | ActionOf<typeof WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED>
  | ActionOf<typeof WEBVIEW_GIT_COMMIT_HASH_CHANGED>
  | ActionOf<typeof WEBVIEW_TITLE_CHANGED>
  | ActionOf<typeof WEBVIEW_UNREAD_CHANGED>
  | ActionOf<typeof WEBVIEW_USER_LOGGED_IN>
  | ActionOf<typeof WEBVIEW_ALLOWED_REDIRECTS_CHANGED>
  | ActionOf<typeof WEBVIEW_FAVICON_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof WEBVIEW_DID_START_LOADING>
  | ActionOf<typeof WEBVIEW_DID_FAIL_LOAD>
  | ActionOf<typeof WEBVIEW_READY>
  | ActionOf<typeof WEBVIEW_ATTACHED>
  | ActionOf<typeof OUTLOOK_CALENDAR_SAVE_CREDENTIALS>
  | ActionOf<typeof WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED>
  | ActionOf<typeof WEBVIEW_SERVER_UNIQUE_ID_UPDATED>
  | ActionOf<typeof WEBVIEW_SERVER_IS_SUPPORTED_VERSION>
  | ActionOf<typeof WEBVIEW_SERVER_VERSION_UPDATED>
  | ActionOf<typeof SUPPORTED_VERSION_DIALOG_DISMISS>
  | ActionOf<typeof SERVER_DOCUMENT_VIEWER_OPEN_URL>
  | ActionOf<typeof WEBVIEW_PAGE_TITLE_CHANGED>
  | ActionOf<typeof WEBVIEW_USER_THEME_APPEARANCE_CHANGED>
  | ActionOf<typeof SIDE_BAR_SERVER_REMOVE>;

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

export const servers: Reducer<Server[], ServersActionTypes> = (
  state = [],
  action
) => {
  switch (action.type) {
    case ADD_SERVER_VIEW_SERVER_ADDED:
    case DEEP_LINKS_SERVER_ADDED: {
      const url = action.payload;
      return upsert(state, { url, title: url });
    }

    case SIDE_BAR_REMOVE_SERVER_CLICKED: {
      const _url = action.payload;
      return state.filter(({ url }) => url !== _url);
    }

    case SIDE_BAR_SERVERS_SORTED: {
      const urls = action.payload;
      return state.sort(
        ({ url: a }, { url: b }) => urls.indexOf(a) - urls.indexOf(b)
      );
    }

    case WEBVIEW_TITLE_CHANGED: {
      const { url, title = url } = action.payload;
      return upsert(state, { url, title });
    }

    case WEBVIEW_PAGE_TITLE_CHANGED: {
      const { url, pageTitle } = action.payload;
      return upsert(state, { url, pageTitle });
    }

    case WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED: {
      const { url, supportedVersions, source } = action.payload;
      return upsert(state, {
        url,
        supportedVersions,
        supportedVersionsSource: source,
      });
    }

    case SUPPORTED_VERSION_DIALOG_DISMISS: {
      const { url } = action.payload;
      return upsert(state, { url, expirationMessageLastTimeShown: new Date() });
    }

    case WEBVIEW_SERVER_UNIQUE_ID_UPDATED: {
      const { url, uniqueID } = action.payload;
      return upsert(state, { url, uniqueID });
    }

    case WEBVIEW_USER_THEME_APPEARANCE_CHANGED: {
      const { url, themeAppearance } = action.payload;
      return upsert(state, { url, themeAppearance });
    }

    case WEBVIEW_SERVER_IS_SUPPORTED_VERSION: {
      const { url, isSupportedVersion } = action.payload;
      return upsert(state, { url, isSupportedVersion });
    }

    case WEBVIEW_SERVER_VERSION_UPDATED: {
      const { url, version } = action.payload;
      return upsert(state, { url, version });
    }

    case WEBVIEW_UNREAD_CHANGED: {
      const { url, badge } = action.payload;
      return upsert(state, { url, badge });
    }

    case WEBVIEW_USER_LOGGED_IN: {
      const { url, userLoggedIn } = action.payload;
      return upsert(state, { url, userLoggedIn });
    }

    case WEBVIEW_ALLOWED_REDIRECTS_CHANGED: {
      const { url, allowedRedirects } = action.payload;
      return upsert(state, { url, allowedRedirects });
    }

    case WEBVIEW_SIDEBAR_STYLE_CHANGED: {
      const { url, style } = action.payload;
      return upsert(state, { url, style });
    }

    case WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED: {
      const { url, customTheme } = action.payload;
      return upsert(state, { url, customTheme });
    }

    case WEBVIEW_GIT_COMMIT_HASH_CHANGED: {
      const { url, gitCommitHash } = action.payload;
      return upsert(state, { url, gitCommitHash });
    }

    case WEBVIEW_FAVICON_CHANGED: {
      const { url, favicon } = action.payload;
      return upsert(state, { url, favicon });
    }

    case WEBVIEW_DID_NAVIGATE: {
      const { url, pageUrl } = action.payload;
      if (pageUrl?.includes(url)) {
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

    case SERVERS_LOADED: {
      const { servers = state } = action.payload;
      return servers.map((server: Server) => ({
        ...server,
        url: ensureUrlFormat(server.url),
      }));
    }

    case APP_SETTINGS_LOADED: {
      const { servers = state } = action.payload;
      return servers.map((server: Server) => ({
        ...server,
        url: ensureUrlFormat(server.url),
        documentViewerOpenUrl: '',
      }));
    }

    case WEBVIEW_READY: {
      const { url, webContentsId } = action.payload;
      return update(state, { url, webContentsId });
    }

    case WEBVIEW_ATTACHED: {
      const { url, webContentsId } = action.payload;
      return update(state, { url, webContentsId });
    }

    case OUTLOOK_CALENDAR_SAVE_CREDENTIALS: {
      const { url, outlookCredentials } = action.payload;
      return upsert(state, { url, outlookCredentials });
    }

    case SERVER_DOCUMENT_VIEWER_OPEN_URL: {
      const { server, documentUrl } = action.payload;
      return upsert(state, { url: server, documentViewerOpenUrl: documentUrl });
    }

    default:
      return state;
  }
};
