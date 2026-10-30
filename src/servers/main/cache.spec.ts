import { runInNewContext } from 'node:vm';

import type { WebContents } from 'electron';
import { webContents } from 'electron';

import { loggers } from '../../logging/scopes';
import { listen } from '../../store';
import type { RootAction } from '../../store/actions';
import {
  CLEAR_CACHE_DIALOG_DELETE_LOGIN_AND_SEARCH_DATA_CLICKED,
  CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED,
  CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED,
  WEBVIEW_USER_LOGGED_IN,
} from '../../ui/actions';
import {
  getServerUrlByWebContentsId,
  getWebContentsByServerUrl,
} from '../../ui/main/serverView';
import {
  handleClearCacheDialog,
  handleUserLoggedOutDataClearing,
} from '../cache';

jest.mock('electron', () => ({
  webContents: { fromId: jest.fn() },
}));

jest.mock('../../logging/scopes', () => ({
  loggers: { e2eeSearch: { warn: jest.fn() } },
}));

jest.mock('../../store', () => ({ listen: jest.fn() }));

jest.mock('../../ui/main/serverView', () => ({
  getServerUrlByWebContentsId: jest.fn(),
  getWebContentsByServerUrl: jest.fn(),
}));

const workspace = 'https://open.rocket.chat/';
const consentKey = (url = workspace, userId = 'u1') =>
  `E2EESearch_OptIn_v2_${JSON.stringify([url, userId])}`;
const syncTimeKey = (url = workspace, userId = 'u1') =>
  `E2EESearch_SyncedAt_v2_${JSON.stringify([url, userId])}`;
const otherStorages = [
  'cookies',
  'indexdb',
  'filesystem',
  'shadercache',
  'serviceworkers',
  'cachestorage',
];

// Execute the production page script against storage with observable mutations.
const createMockWebContents = (initial: Record<string, string> = {}) => {
  const localStorage = { ...initial };
  const order: string[] = [];
  const removeItem = jest.fn((key: string) => {
    delete localStorage[key];
  });
  const clear = jest.fn(() => {
    for (const key of Object.keys(localStorage)) removeItem(key);
  });
  const setItem = jest.fn((key: string, value: string) => {
    localStorage[key] = value;
  });
  Object.defineProperties(localStorage, {
    getItem: { value: (key: string) => localStorage[key] ?? null },
    removeItem: { value: removeItem },
    clear: { value: clear },
    setItem: { value: setItem },
  });
  const guest = {
    id: 9,
    session: {
      clearCache: jest.fn().mockResolvedValue(undefined),
      clearStorageData: jest.fn().mockImplementation(async (options) => {
        order.push('clear');
        if (!options?.storages || options.storages.includes('localstorage')) {
          clear();
        }
      }),
    },
    reloadIgnoringCache: jest.fn(() => {
      order.push('reload');
    }),
    executeJavaScript: jest.fn().mockImplementation(async (code: string) => {
      order.push('localstorage');
      return runInNewContext(code, { localStorage, URL });
    }),
  } as unknown as WebContents;
  return { guest, localStorage, removeItem, clear, setItem, order };
};

const mockListen = listen as unknown as jest.Mock<
  () => void,
  [string, (action: RootAction) => void]
>;
const mockGetWebContentsByServerUrl =
  getWebContentsByServerUrl as jest.MockedFunction<
    typeof getWebContentsByServerUrl
  >;
const mockGetServerUrlByWebContentsId =
  getServerUrlByWebContentsId as jest.MockedFunction<
    typeof getServerUrlByWebContentsId
  >;

const dispatchAction = async (type: string, payload: unknown) => {
  const [, listener] = mockListen.mock.calls.find(([t]) => t === type)!;
  await listener({ type, payload } as RootAction);
};

const dispatchUserLoggedIn = (userLoggedIn: boolean, url = workspace) =>
  dispatchAction(WEBVIEW_USER_LOGGED_IN, { url, userLoggedIn });

const logOut = async (guest: WebContents, url = workspace) => {
  mockGetWebContentsByServerUrl.mockReturnValue(guest);
  await dispatchUserLoggedIn(true, url);
  await dispatchUserLoggedIn(false, url);
};

describe('servers/cache handleUserLoggedOutDataClearing', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetWebContentsByServerUrl.mockReturnValue(undefined);
    handleUserLoggedOutDataClearing();
    await dispatchUserLoggedIn(false);
    mockGetWebContentsByServerUrl.mockClear();
  });

  it('clears login storage and reloads on a logged-in to logged-out transition', async () => {
    const { guest, localStorage } = createMockWebContents({
      'Meteor.loginToken': 'secret',
    });

    await logOut(guest);

    expect(mockGetWebContentsByServerUrl).toHaveBeenCalledWith(workspace);
    expect(localStorage).toEqual({});
    expect(guest.session.clearCache).toHaveBeenCalledTimes(1);
    expect(guest.session.clearStorageData).toHaveBeenCalledWith({
      storages: otherStorages,
    });
    expect(guest.reloadIgnoringCache).toHaveBeenCalledTimes(1);
  });

  it('does not clear on the initial logged-out state at startup or attach', async () => {
    await dispatchUserLoggedIn(false);
    expect(mockGetWebContentsByServerUrl).not.toHaveBeenCalled();
  });

  it('does not clear on a logged-out to logged-in transition', async () => {
    await dispatchUserLoggedIn(true);
    expect(mockGetWebContentsByServerUrl).not.toHaveBeenCalled();
  });

  it('does nothing when no webContents is found for the workspace', async () => {
    await dispatchUserLoggedIn(true);
    await expect(dispatchUserLoggedIn(false)).resolves.not.toThrow();
    expect(mockGetWebContentsByServerUrl).toHaveBeenCalledWith(workspace);
  });

  it('retains scoped consent and catch-up times without a transient opt-out', async () => {
    const retained = {
      [consentKey()]: 'true',
      [syncTimeKey()]: '1234',
      [consentKey(workspace, 'u2_[]"')]: 'true',
      [syncTimeKey(workspace, 'u2_[]"')]: '5678.5',
      [consentKey(workspace, 'a'.repeat(129))]: 'true',
    };
    const { guest, localStorage, removeItem, clear, setItem, order } =
      createMockWebContents({ ...retained, 'Meteor.loginToken': 'secret' });

    await logOut(guest);

    expect(localStorage).toEqual(retained);
    for (const key of Object.keys(retained)) {
      expect(removeItem).not.toHaveBeenCalledWith(key);
    }
    expect(removeItem).toHaveBeenCalledWith('Meteor.loginToken');
    expect(clear).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(guest.session.clearStorageData).toHaveBeenCalledWith({
      storages: otherStorages,
    });
    expect(order).toEqual(['localstorage', 'clear', 'reload']);
  });

  it('does not retain legacy, malformed, noncanonical, or unrelated metadata', async () => {
    const invalidScopes: unknown[] = [
      [workspace, ''],
      [workspace, 42],
      [workspace],
      [workspace, 'u1', 'extra'],
      { workspace, userId: 'u1' },
      null,
      ['https://OPEN.ROCKET.CHAT:443/', 'u1'],
      ['https://open.rocket.chat', 'u1'],
      ['https://user:secret@open.rocket.chat/', 'u1'],
      [`${workspace}?workspace=other`, 'u1'],
      [`${workspace}#other`, 'u1'],
      ['file:///workspace/', 'u1'],
      ['/workspace/', 'u1'],
      ['https://other.example/', 'u1'],
      [`${workspace}other/`, 'u1'],
      ['http://open.rocket.chat/', 'u1'],
    ];
    const entries: Record<string, string> = {
      [consentKey()]: 'true',
      [syncTimeKey()]: '1234',
      'Meteor.loginToken': 'secret',
      'E2EESearch_OptIn_u1': 'true',
      'E2EESearch_SyncedAt_u1': '1234',
      'E2EESearch_OptIn_v2_bad': 'true',
      'E2EESearch_SyncedAt_v2_bad': '1234',
      [`E2EESearch_OptIn_v2_[ "${workspace}", "u1" ]`]: 'true',
    };
    for (const scope of invalidScopes) {
      entries[`E2EESearch_OptIn_v2_${JSON.stringify(scope)}`] = 'true';
      entries[`E2EESearch_SyncedAt_v2_${JSON.stringify(scope)}`] = '1234';
    }
    const { guest, localStorage } = createMockWebContents(entries);

    await logOut(guest);

    expect(localStorage).toEqual({
      [consentKey()]: 'true',
      [syncTimeKey()]: '1234',
    });
  });

  it.each(['false', 'TRUE', '1', '', ' true '])(
    'removes consent with the invalid value %j',
    async (value) => {
      const { guest, localStorage } = createMockWebContents({
        [consentKey()]: value,
      });
      await logOut(guest);
      expect(localStorage).toEqual({});
    }
  );

  it.each(['0', '-1', 'NaN', 'Infinity', '-Infinity', '', ' ', '1234ms'])(
    'removes a catch-up time with the invalid value %j',
    async (value) => {
      const { guest, localStorage } = createMockWebContents({
        [syncTimeKey()]: value,
      });
      await logOut(guest);
      expect(localStorage).toEqual({});
    }
  );

  it('uses the canonical workspace root, not the current page path', async () => {
    const current = 'https://chat.example/a/';
    const retained = {
      [consentKey(current)]: 'true',
      [syncTimeKey(current)]: '1234',
    };
    const { guest, localStorage } = createMockWebContents({
      ...retained,
      [consentKey('https://chat.example/b/')]: 'true',
      [syncTimeKey('https://chat.example/a/settings/')]: '5678',
    });

    await logOut(guest, 'https://CHAT.EXAMPLE:443/a');

    expect(localStorage).toEqual(retained);
  });

  it.each([
    '',
    '/workspace/',
    'file:///workspace/',
    'https://user:secret@open.rocket.chat/',
    `${workspace}?workspace=other`,
    `${workspace}#other`,
  ])('retains no metadata for an ambiguous workspace %j', async (url) => {
    const { guest, localStorage } = createMockWebContents({
      [consentKey()]: 'true',
      'Meteor.loginToken': 'secret',
    });
    await logOut(guest, url);
    expect(localStorage).toEqual({});
  });

  it('ends the login session when selective local storage removal fails', async () => {
    const { guest, localStorage } = createMockWebContents({
      [consentKey()]: 'true',
      'Meteor.loginToken': 'secret',
    });
    (guest.executeJavaScript as jest.Mock).mockRejectedValue(
      new TypeError('page gone')
    );

    await logOut(guest);

    expect(localStorage).toEqual({});
    expect(loggers.e2eeSearch.warn).toHaveBeenCalledWith(
      'local search metadata not kept after a login data clear',
      { name: 'TypeError' }
    );
    expect(guest.reloadIgnoringCache).toHaveBeenCalledTimes(1);
  });
});

describe('servers/cache handleClearCacheDialog', () => {
  const mockFromId = webContents.fromId as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerUrlByWebContentsId.mockReturnValue(workspace);
    handleClearCacheDialog();
  });

  it('retains scoped search metadata in place when it deletes login data', async () => {
    const retained = {
      [consentKey()]: 'true',
      [syncTimeKey()]: '1234',
    };
    const { guest, localStorage, removeItem, clear, setItem } =
      createMockWebContents({ ...retained, 'Meteor.loginToken': 'secret' });
    mockFromId.mockReturnValue(guest);

    await dispatchAction(CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED, 9);

    expect(mockFromId).toHaveBeenCalledWith(9);
    expect(mockGetServerUrlByWebContentsId).toHaveBeenCalledWith(9);
    expect(localStorage).toEqual(retained);
    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(clear).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(guest.session.clearStorageData).toHaveBeenCalledWith({
      storages: otherStorages,
    });
    expect(guest.reloadIgnoringCache).toHaveBeenCalledTimes(1);
  });

  it('does not infer the workspace from another page on the same origin', async () => {
    const current = 'https://chat.example/a/';
    const { guest, localStorage } = createMockWebContents({
      [consentKey(current)]: 'true',
      [syncTimeKey(current)]: '1234',
      [consentKey('https://chat.example/b/')]: 'true',
      'Meteor.loginToken': 'secret',
    });
    mockFromId.mockReturnValue(guest);
    mockGetServerUrlByWebContentsId.mockReturnValue(
      'https://CHAT.EXAMPLE:443/a'
    );

    await dispatchAction(CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED, 9);

    expect(localStorage).toEqual({
      [consentKey(current)]: 'true',
      [syncTimeKey(current)]: '1234',
    });
  });

  it('clears login data without retaining metadata if the workspace is unknown', async () => {
    const { guest, localStorage } = createMockWebContents({
      [consentKey()]: 'true',
      'Meteor.loginToken': 'secret',
    });
    mockFromId.mockReturnValue(guest);
    mockGetServerUrlByWebContentsId.mockReturnValue(undefined);

    await dispatchAction(CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED, 9);

    expect(localStorage).toEqual({});
    expect(guest.session.clearStorageData).toHaveBeenCalledWith();
    expect(guest.reloadIgnoringCache).toHaveBeenCalledTimes(1);
  });

  it('removes all metadata when the user also requests search-data removal', async () => {
    const { guest, localStorage, order } = createMockWebContents({
      [consentKey()]: 'true',
      [syncTimeKey()]: '1234',
      [consentKey('https://chat.example/b/')]: 'true',
      'E2EESearch_OptIn_u1': 'true',
      'Meteor.loginToken': 'secret',
    });
    mockFromId.mockReturnValue(guest);

    await dispatchAction(
      CLEAR_CACHE_DIALOG_DELETE_LOGIN_AND_SEARCH_DATA_CLICKED,
      9
    );

    expect(localStorage).toEqual({});
    expect(order).toEqual(['clear', 'reload']);
    expect(guest.session.clearStorageData).toHaveBeenCalledWith();
    expect(guest.executeJavaScript).not.toHaveBeenCalled();
  });

  it('leaves login data and search metadata unchanged when it keeps login data', async () => {
    const retained = {
      [consentKey()]: 'true',
      [syncTimeKey()]: '1234',
      'Meteor.loginToken': 'secret',
    };
    const { guest, localStorage } = createMockWebContents(retained);
    mockFromId.mockReturnValue(guest);

    await dispatchAction(CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED, 9);

    expect(localStorage).toEqual(retained);
    expect(guest.executeJavaScript).not.toHaveBeenCalled();
    expect(guest.session.clearStorageData).toHaveBeenCalledWith({
      storages: otherStorages,
    });
    expect(guest.reloadIgnoringCache).toHaveBeenCalledTimes(1);
  });

  it.each([
    CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED,
    CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED,
    CLEAR_CACHE_DIALOG_DELETE_LOGIN_AND_SEARCH_DATA_CLICKED,
  ])(
    'does nothing if the webContents no longer exists for %s',
    async (type) => {
      mockFromId.mockReturnValue(undefined);
      await expect(dispatchAction(type, 9)).resolves.not.toThrow();
      expect(mockGetServerUrlByWebContentsId).not.toHaveBeenCalled();
    }
  );
});
