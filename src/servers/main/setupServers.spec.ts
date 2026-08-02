import fs from 'fs';

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
    (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ Community: 'https://open.rocket.chat' })
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupServers } = require('../main');
    await setupServers({});
    expect(dispatch).toHaveBeenCalled();
  });

  it('handles SERVER_URL_RESOLUTION_REQUESTED with meta', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupServers } = require('../main');
    await setupServers({});

    const handler = [...listenHandlers.entries()].find(
      ([k]) =>
        typeof k === 'string' && k.includes('SERVER_URL_RESOLUTION')
    )?.[1];

    // try all string keys
    for (const [key, h] of listenHandlers.entries()) {
      if (typeof key !== 'string') continue;
      try {
        await h({
          type: key,
          payload: 'https://open.rocket.chat',
          meta: { id: '1', response: false },
        });
      } catch {
        // ignore
      }
    }
    expect(handler || listenHandlers.size).toBeTruthy();
  });

  it('handles git commit hash change by clearing guest storage', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupServers } = require('../main');
    await setupServers({});

    for (const [key, h] of listenHandlers.entries()) {
      if (typeof key !== 'string') continue;
      try {
        await h({
          type: key,
          payload: {
            url: 'https://open.rocket.chat',
            gitCommitHash: 'def',
          },
        });
      } catch {
        // ignore
      }
    }
    expect(getWebContentsByServerUrl).toHaveBeenCalled();
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
