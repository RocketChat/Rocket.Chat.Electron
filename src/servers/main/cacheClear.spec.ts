import {
  WEBVIEW_SERVER_BUILD_CHECK,
  WEBVIEW_SERVER_BUILD_UPDATED,
} from '../../ui/actions';
import { clearWebviewStorageKeepingLoginData } from '../cache';
import { setupServers } from '../main';

const serverUrl = 'https://example.rocket.chat/';

let mockState: any;
const mockListeners = new Map<string, (action: any) => void | Promise<void>>();
const mockDispatchedActions: any[] = [];

jest.mock('../../app/main/app', () => ({
  packageJsonInformation: { productName: 'Rocket.Chat' },
}));

jest.mock('../../ipc/main', () => ({
  invoke: jest.fn(),
}));

jest.mock('../../store', () => ({
  dispatch: jest.fn((action) => {
    mockDispatchedActions.push(action);
    if (action.type === WEBVIEW_SERVER_BUILD_CHECK) {
      void mockListeners.get(WEBVIEW_SERVER_BUILD_CHECK)?.(action);
    }
  }),
  listen: jest.fn((type, listener) => {
    mockListeners.set(type, listener);
    return jest.fn();
  }),
  safeSelect: jest.fn((selector) => selector(mockState)),
  select: jest.fn((selector) => selector(mockState)),
}));

jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(),
}));

jest.mock('../../ui/main/serverView', () => ({
  getWebContentsByServerUrl: jest.fn(() => ({ id: 1 })),
}));

jest.mock('../../urls', () => ({
  parse: jest.fn((url) => new URL(url)),
}));

jest.mock('../cache', () => ({
  clearWebviewStorageKeepingLoginData: jest.fn(() => Promise.resolve()),
}));

const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('setupServers cache-clear cooldown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    mockListeners.clear();
    mockDispatchedActions.length = 0;
    mockState = {
      currentView: { url: serverUrl },
      servers: [
        {
          url: serverUrl,
          title: serverUrl,
          lastCommitBuildId: 'old-build',
        },
      ],
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('adopts repeated build signals during cooldown without a second clear', async () => {
    await setupServers({});
    mockDispatchedActions.length = 0;

    const listener = mockListeners.get(WEBVIEW_SERVER_BUILD_CHECK);
    expect(listener).toBeDefined();

    await listener?.({
      type: WEBVIEW_SERVER_BUILD_CHECK,
      payload: {
        url: serverUrl,
        buildId: 'new-build',
        buildIdSource: 'commit',
      },
    });

    expect(clearWebviewStorageKeepingLoginData).toHaveBeenCalledTimes(1);
    expect(mockDispatchedActions).toContainEqual({
      type: WEBVIEW_SERVER_BUILD_UPDATED,
      payload: {
        url: serverUrl,
        buildId: 'new-build',
        cacheVersion: undefined,
        buildIdSource: 'commit',
      },
    });

    mockState.servers[0].lastCommitBuildId = 'new-build';
    mockDispatchedActions.length = 0;
    jest.setSystemTime(1_000);

    await listener?.({
      type: WEBVIEW_SERVER_BUILD_CHECK,
      payload: {
        url: serverUrl,
        buildId: 'newer-build',
        buildIdSource: 'commit',
      },
    });

    expect(clearWebviewStorageKeepingLoginData).toHaveBeenCalledTimes(1);
    expect(mockDispatchedActions).toContainEqual({
      type: WEBVIEW_SERVER_BUILD_UPDATED,
      payload: {
        url: serverUrl,
        buildId: 'newer-build',
        cacheVersion: undefined,
        buildIdSource: 'commit',
      },
    });

    jest.advanceTimersByTime(59_000);
    await flushPromises();

    expect(clearWebviewStorageKeepingLoginData).toHaveBeenCalledTimes(1);
  });
});
