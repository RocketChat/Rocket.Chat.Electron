import { APP_SETTINGS_LOADED } from '../../../app/actions';
import { DEEP_LINKS_SERVER_ADDED } from '../../../deepLinks/actions';
import { OUTLOOK_CALENDAR_SAVE_CREDENTIALS } from '../../../outlookCalendar/actions';
import {
  ADD_SERVER_VIEW_SERVER_ADDED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  SIDE_BAR_SERVERS_SORTED,
  WEBVIEW_PAGE_TITLE_CHANGED,
  WEBVIEW_DID_NAVIGATE,
  WEBVIEW_SIDEBAR_STYLE_CHANGED,
  WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED,
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
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_LOADING,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR,
  WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
  WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
  WEBVIEW_SERVER_VERSION_UPDATED,
  SUPPORTED_VERSION_DIALOG_DISMISS,
} from '../../../ui/actions';
import { SERVERS_LOADED, SERVER_DOCUMENT_VIEWER_OPEN_URL } from '../../actions';
import type { Server } from '../../common';
import { servers } from '../../reducers';

const url = 'https://open.rocket.chat/';
const existing: Server = { url, title: 'Open' };

describe('servers reducer', () => {
  it('should return initial state as empty array', () => {
    expect(servers(undefined, { type: 'UNKNOWN_ACTION' } as any)).toEqual([]);
  });

  it('should return current state on unknown action', () => {
    const state = [existing];
    expect(servers(state, { type: 'UNKNOWN_ACTION' } as any)).toBe(state);
  });

  describe('ADD_SERVER_VIEW_SERVER_ADDED / DEEP_LINKS_SERVER_ADDED (upsert insert)', () => {
    it('should add a new server with url as title', () => {
      const newState = servers([], {
        type: ADD_SERVER_VIEW_SERVER_ADDED,
        payload: url,
      } as any);

      expect(newState).toEqual([{ url, title: url }]);
    });

    it('should handle DEEP_LINKS_SERVER_ADDED the same way', () => {
      const newState = servers([], {
        type: DEEP_LINKS_SERVER_ADDED,
        payload: url,
      } as any);

      expect(newState).toEqual([{ url, title: url }]);
    });

    it('should merge into an existing server (upsert update path)', () => {
      const newState = servers([existing], {
        type: ADD_SERVER_VIEW_SERVER_ADDED,
        payload: url,
      } as any);

      expect(newState).toEqual([{ url, title: url }]);
      expect(newState).not.toBe([existing]);
    });
  });

  describe('SIDE_BAR_REMOVE_SERVER_CLICKED', () => {
    it('should remove the server with matching url', () => {
      const other: Server = { url: 'https://other.rocket.chat/' };
      const newState = servers([existing, other], {
        type: SIDE_BAR_REMOVE_SERVER_CLICKED,
        payload: url,
      } as any);

      expect(newState).toEqual([other]);
    });
  });

  describe('SIDE_BAR_SERVERS_SORTED', () => {
    it('should sort servers by the order of urls in payload', () => {
      const a: Server = { url: 'https://a/' };
      const b: Server = { url: 'https://b/' };
      const c: Server = { url: 'https://c/' };

      const newState = servers([c, a, b], {
        type: SIDE_BAR_SERVERS_SORTED,
        payload: ['https://a/', 'https://b/', 'https://c/'],
      } as any);

      expect(newState.map((s) => s.url)).toEqual([
        'https://a/',
        'https://b/',
        'https://c/',
      ]);
    });
  });

  describe('WEBVIEW_TITLE_CHANGED', () => {
    it('should upsert the title', () => {
      const newState = servers([existing], {
        type: WEBVIEW_TITLE_CHANGED,
        payload: { url, title: 'New Title' },
      } as any);

      expect(newState[0].title).toBe('New Title');
    });

    it('should fall back to url when title is missing', () => {
      const newState = servers([], {
        type: WEBVIEW_TITLE_CHANGED,
        payload: { url },
      } as any);

      expect(newState[0].title).toBe(url);
    });
  });

  describe('WEBVIEW_PAGE_TITLE_CHANGED', () => {
    it('should upsert the pageTitle', () => {
      const newState = servers([existing], {
        type: WEBVIEW_PAGE_TITLE_CHANGED,
        payload: { url, pageTitle: 'Page' },
      } as any);

      expect(newState[0].pageTitle).toBe('Page');
    });
  });

  describe('WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED', () => {
    it('should set supportedVersions, source and success fetch state', () => {
      const supportedVersions = { foo: 'bar' };
      const newState = servers([existing], {
        type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
        payload: { url, supportedVersions, source: 'cloud' },
      } as any);

      expect(newState[0].supportedVersions).toBe(supportedVersions);
      expect(newState[0].supportedVersionsSource).toBe('cloud');
      expect(newState[0].supportedVersionsFetchState).toBe('success');
    });
  });

  describe('WEBVIEW_SERVER_SUPPORTED_VERSIONS_LOADING', () => {
    it('should set fetch state to loading', () => {
      const newState = servers([existing], {
        type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_LOADING,
        payload: { url },
      } as any);

      expect(newState[0].supportedVersionsFetchState).toBe('loading');
    });
  });

  describe('WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR', () => {
    it('should set fetch state to error', () => {
      const newState = servers([existing], {
        type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR,
        payload: { url },
      } as any);

      expect(newState[0].supportedVersionsFetchState).toBe('error');
    });
  });

  describe('SUPPORTED_VERSION_DIALOG_DISMISS', () => {
    it('should set expirationMessageLastTimeShown to a Date', () => {
      const newState = servers([existing], {
        type: SUPPORTED_VERSION_DIALOG_DISMISS,
        payload: { url },
      } as any);

      expect(newState[0].expirationMessageLastTimeShown).toBeInstanceOf(Date);
    });
  });

  describe('WEBVIEW_SERVER_UNIQUE_ID_UPDATED', () => {
    it('should set uniqueID', () => {
      const newState = servers([existing], {
        type: WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
        payload: { url, uniqueID: 'abc' },
      } as any);

      expect(newState[0].uniqueID).toBe('abc');
    });
  });

  describe('WEBVIEW_SERVER_IS_SUPPORTED_VERSION', () => {
    it('should set isSupportedVersion and validatedAt', () => {
      const newState = servers([existing], {
        type: WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
        payload: { url, isSupportedVersion: true },
      } as any);

      expect(newState[0].isSupportedVersion).toBe(true);
      expect(newState[0].supportedVersionsValidatedAt).toBeInstanceOf(Date);
    });
  });

  describe('WEBVIEW_SERVER_VERSION_UPDATED', () => {
    it('should set version and gitCommitHash when hash provided', () => {
      const newState = servers([existing], {
        type: WEBVIEW_SERVER_VERSION_UPDATED,
        payload: { url, version: '7.0.0', gitCommitHash: 'deadbeef' },
      } as any);

      expect(newState[0].version).toBe('7.0.0');
      expect(newState[0].gitCommitHash).toBe('deadbeef');
    });

    it('should not overwrite gitCommitHash when hash is undefined', () => {
      const withHash: Server = { url, gitCommitHash: 'keepme' };
      const newState = servers([withHash], {
        type: WEBVIEW_SERVER_VERSION_UPDATED,
        payload: { url, version: '7.0.0' },
      } as any);

      expect(newState[0].version).toBe('7.0.0');
      expect(newState[0].gitCommitHash).toBe('keepme');
    });
  });

  describe('WEBVIEW_UNREAD_CHANGED', () => {
    it('should set badge', () => {
      const newState = servers([existing], {
        type: WEBVIEW_UNREAD_CHANGED,
        payload: { url, badge: 5 },
      } as any);

      expect(newState[0].badge).toBe(5);
    });
  });

  describe('WEBVIEW_USER_LOGGED_IN', () => {
    it('should set userLoggedIn', () => {
      const newState = servers([existing], {
        type: WEBVIEW_USER_LOGGED_IN,
        payload: { url, userLoggedIn: true },
      } as any);

      expect(newState[0].userLoggedIn).toBe(true);
    });
  });

  describe('WEBVIEW_ALLOWED_REDIRECTS_CHANGED', () => {
    it('should set allowedRedirects', () => {
      const newState = servers([existing], {
        type: WEBVIEW_ALLOWED_REDIRECTS_CHANGED,
        payload: { url, allowedRedirects: ['https://x/'] },
      } as any);

      expect(newState[0].allowedRedirects).toEqual(['https://x/']);
    });
  });

  describe('WEBVIEW_SIDEBAR_STYLE_CHANGED', () => {
    it('should set style', () => {
      const style = { background: '#000', color: '#fff', border: null };
      const newState = servers([existing], {
        type: WEBVIEW_SIDEBAR_STYLE_CHANGED,
        payload: { url, style },
      } as any);

      expect(newState[0].style).toBe(style);
    });
  });

  describe('WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED', () => {
    it('should set customTheme', () => {
      const newState = servers([existing], {
        type: WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED,
        payload: { url, customTheme: 'dark' },
      } as any);

      expect(newState[0].customTheme).toBe('dark');
    });
  });

  describe('WEBVIEW_GIT_COMMIT_HASH_CHANGED', () => {
    it('should set gitCommitHash', () => {
      const newState = servers([existing], {
        type: WEBVIEW_GIT_COMMIT_HASH_CHANGED,
        payload: { url, gitCommitHash: 'abc123' },
      } as any);

      expect(newState[0].gitCommitHash).toBe('abc123');
    });
  });

  describe('WEBVIEW_FAVICON_CHANGED', () => {
    it('should set favicon', () => {
      const newState = servers([existing], {
        type: WEBVIEW_FAVICON_CHANGED,
        payload: { url, favicon: 'data:image/png;base64,xxx' },
      } as any);

      expect(newState[0].favicon).toBe('data:image/png;base64,xxx');
    });
  });

  describe('WEBVIEW_DID_NAVIGATE', () => {
    it('should set lastPath when pageUrl includes the server url', () => {
      const newState = servers([existing], {
        type: WEBVIEW_DID_NAVIGATE,
        payload: { url, pageUrl: `${url}channel/general` },
      } as any);

      expect(newState[0].lastPath).toBe(`${url}channel/general`);
    });

    it('should return unchanged state when pageUrl does not include url', () => {
      const state = [existing];
      const newState = servers(state, {
        type: WEBVIEW_DID_NAVIGATE,
        payload: { url, pageUrl: 'https://elsewhere/' },
      } as any);

      expect(newState).toBe(state);
    });

    it('should return unchanged state when pageUrl is undefined', () => {
      const state = [existing];
      const newState = servers(state, {
        type: WEBVIEW_DID_NAVIGATE,
        payload: { url, pageUrl: undefined },
      } as any);

      expect(newState).toBe(state);
    });
  });

  describe('WEBVIEW_DID_START_LOADING', () => {
    it('should clear the failed flag', () => {
      const failed: Server = { url, failed: true };
      const newState = servers([failed], {
        type: WEBVIEW_DID_START_LOADING,
        payload: { url },
      } as any);

      expect(newState[0].failed).toBe(false);
    });
  });

  describe('WEBVIEW_DID_FAIL_LOAD', () => {
    it('should set failed when main frame', () => {
      const newState = servers([existing], {
        type: WEBVIEW_DID_FAIL_LOAD,
        payload: { url, isMainFrame: true },
      } as any);

      expect(newState[0].failed).toBe(true);
    });

    it('should return unchanged state when not main frame', () => {
      const state = [existing];
      const newState = servers(state, {
        type: WEBVIEW_DID_FAIL_LOAD,
        payload: { url, isMainFrame: false },
      } as any);

      expect(newState).toBe(state);
    });
  });

  describe('SERVERS_LOADED', () => {
    it('should normalize server urls from payload', () => {
      const newState = servers([], {
        type: SERVERS_LOADED,
        payload: { servers: [{ url: 'https://open.rocket.chat' }] },
      } as any);

      expect(newState[0].url).toBe('https://open.rocket.chat/');
    });

    it('should fall back to current state when servers missing in payload', () => {
      const state = [{ url: 'https://open.rocket.chat' } as Server];
      const newState = servers(state, {
        type: SERVERS_LOADED,
        payload: {},
      } as any);

      expect(newState[0].url).toBe('https://open.rocket.chat/');
    });
  });

  describe('APP_SETTINGS_LOADED', () => {
    it('should normalize urls and reset document viewer fields', () => {
      const newState = servers([], {
        type: APP_SETTINGS_LOADED,
        payload: { servers: [{ url: 'https://open.rocket.chat' }] },
      } as any);

      expect(newState[0].url).toBe('https://open.rocket.chat/');
      expect(newState[0].documentViewerOpenUrl).toBe('');
      expect(newState[0].documentViewerFormat).toBe('');
    });

    it('should fall back to current state when servers missing', () => {
      const state = [{ url: 'https://open.rocket.chat' } as Server];
      const newState = servers(state, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any);

      expect(newState[0].url).toBe('https://open.rocket.chat/');
    });
  });

  describe('WEBVIEW_READY / WEBVIEW_ATTACHED (update path)', () => {
    it('should set webContentsId on an existing server', () => {
      const newState = servers([existing], {
        type: WEBVIEW_READY,
        payload: { url, webContentsId: 42 },
      } as any);

      expect(newState[0].webContentsId).toBe(42);
    });

    it('should return unchanged state for unknown url (update no-op)', () => {
      const state = [existing];
      const newState = servers(state, {
        type: WEBVIEW_ATTACHED,
        payload: { url: 'https://unknown/', webContentsId: 7 },
      } as any);

      expect(newState).toBe(state);
    });
  });

  describe('OUTLOOK_CALENDAR_SAVE_CREDENTIALS', () => {
    it('should set outlookCredentials', () => {
      const outlookCredentials = {
        userId: 'u',
        login: 'l',
        password: 'p',
        serverUrl: url,
      };
      const newState = servers([existing], {
        type: OUTLOOK_CALENDAR_SAVE_CREDENTIALS,
        payload: { url, outlookCredentials },
      } as any);

      expect(newState[0].outlookCredentials).toBe(outlookCredentials);
    });
  });

  describe('SERVER_DOCUMENT_VIEWER_OPEN_URL', () => {
    it('should set document viewer url and format', () => {
      const newState = servers([existing], {
        type: SERVER_DOCUMENT_VIEWER_OPEN_URL,
        payload: {
          server: url,
          documentUrl: 'https://doc/',
          documentFormat: 'pdf',
        },
      } as any);

      expect(newState[0].documentViewerOpenUrl).toBe('https://doc/');
      expect(newState[0].documentViewerFormat).toBe('pdf');
    });

    it('should default documentViewerFormat to empty string when not provided', () => {
      const newState = servers([existing], {
        type: SERVER_DOCUMENT_VIEWER_OPEN_URL,
        payload: { server: url, documentUrl: 'https://doc/' },
      } as any);

      expect(newState[0].documentViewerFormat).toBe('');
    });
  });

  describe('immutability', () => {
    it('should not mutate the original state array on upsert', () => {
      const state = [existing];
      const newState = servers(state, {
        type: WEBVIEW_TITLE_CHANGED,
        payload: { url, title: 'Changed' },
      } as any);

      expect(newState).not.toBe(state);
      expect(state[0].title).toBe('Open');
    });
  });
});
