import {
  WEBVIEW_GIT_COMMIT_HASH_CHECK,
  WEBVIEW_GIT_COMMIT_HASH_CHANGED,
} from '../../ui/actions';
import {
  SERVER_URL_RESOLUTION_REQUESTED,
  SERVER_URL_RESOLVED,
} from '../actions';

const listenHandlers = new Map<string | Function, Function>();
const dispatch = jest.fn();
const select = jest.fn();
const invoke = jest.fn();
const getWebContentsByServerUrl = jest.fn();

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(() => false),
    promises: {
      readFile: jest.fn(async () => {
        throw new Error('missing');
      }),
      unlink: jest.fn(async () => undefined),
    },
  };
});

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/user'),
    getAppPath: jest.fn(() => '/app'),
  },
}));

jest.mock('../../app/main/app', () => ({
  packageJsonInformation: { productName: 'Rocket.Chat', version: '4.0.0' },
}));

jest.mock('../../ipc/main', () => ({
  invoke: (...args: any[]) => invoke(...args),
}));

jest.mock('../../store', () => ({
  select: (...args: any[]) => select(...args),
  dispatch: (...args: any[]) => dispatch(...args),
  listen: (typeOrPredicate: any, handler?: Function) => {
    if (handler) {
      listenHandlers.set(typeOrPredicate, handler);
    } else {
      listenHandlers.set('predicate', typeOrPredicate);
    }
    return jest.fn();
  },
  watch: jest.fn(() => jest.fn()),
}));

jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(async () => ({ webContents: { id: 1 } })),
}));

jest.mock('../../ui/main/serverView', () => ({
  getWebContentsByServerUrl: (...args: any[]) =>
    getWebContentsByServerUrl(...args),
}));

describe('setupServers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listenHandlers.clear();
    select.mockImplementation((sel: any) =>
      sel({
        servers: [
          {
            url: 'https://open.rocket.chat',
            title: 'Community',
            gitCommitHash: 'abc',
          },
        ],
        currentView: { url: 'https://open.rocket.chat' },
      })
    );
    invoke.mockResolvedValue(['https://open.rocket.chat/', '6.5.0']);
    getWebContentsByServerUrl.mockReturnValue({
      session: {
        clearStorageData: jest.fn(async () => undefined),
        clearCache: jest.fn(async () => undefined),
      },
      reload: jest.fn(),
    });
    jest.resetModules();
  });

  it('registers listeners and loads hosts from localStorage string', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupServers } = require('../main');
    await setupServers({
      'rocket.chat.hosts': JSON.stringify('https://extra.rocket.chat'),
      'rocket.chat.currentHost': 'https://extra.rocket.chat',
    });

    expect(listenHandlers.size).toBeGreaterThan(0);
    expect(dispatch).toHaveBeenCalled();
  });

  it('loads hosts from localStorage array JSON', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupServers } = require('../main');
    await setupServers({
      'rocket.chat.hosts': JSON.stringify(
        JSON.stringify(['https://a.example/', 'https://b.example/'])
      ),
    });
    expect(dispatch).toHaveBeenCalled();
  });

  it('loads app servers when map empty', async () => {
    select.mockImplementation((sel: any) =>
      sel({
        servers: [],
        currentView: 'downloads',
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const freshFs = require('fs');
    (freshFs.promises.readFile as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ Community: 'https://open.rocket.chat' })
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupServers } = require('../main');
    await setupServers({});
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          servers: [{ url: 'https://open.rocket.chat', title: 'Community' }],
        }),
      })
    );
  });

  it('handles SERVER_URL_RESOLUTION_REQUESTED with meta', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupServers } = require('../main');
    await setupServers({});

    const handler = listenHandlers.get(SERVER_URL_RESOLUTION_REQUESTED);
    expect(handler).toBeDefined();

    await handler?.({
      type: SERVER_URL_RESOLUTION_REQUESTED,
      payload: 'https://open.rocket.chat',
      meta: { id: '1', response: false },
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: SERVER_URL_RESOLVED,
      payload: ['https://open.rocket.chat/', 'ok'],
      meta: { response: true, id: '1' },
    });
  });

  it('handles git commit hash change by clearing guest storage', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupServers } = require('../main');
    await setupServers({});

    const handler = listenHandlers.get(WEBVIEW_GIT_COMMIT_HASH_CHECK);
    expect(handler).toBeDefined();

    const session = getWebContentsByServerUrl();
    await handler?.({
      type: WEBVIEW_GIT_COMMIT_HASH_CHECK,
      payload: {
        url: 'https://open.rocket.chat',
        gitCommitHash: 'def',
      },
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: WEBVIEW_GIT_COMMIT_HASH_CHANGED,
      payload: { url: 'https://open.rocket.chat', gitCommitHash: 'def' },
    });
    expect(getWebContentsByServerUrl).toHaveBeenCalledWith(
      'https://open.rocket.chat'
    );
    expect(session.session.clearStorageData).toHaveBeenCalledWith({
      storages: ['indexdb'],
    });
    expect(session.session.clearCache).toHaveBeenCalled();
    expect(session.reload).toHaveBeenCalled();
  });

  it('ignores malformed hosts JSON', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupServers } = require('../main');
    await setupServers({
      'rocket.chat.hosts': '{not-json',
    });
    expect(dispatch).toHaveBeenCalled();
  });
});
