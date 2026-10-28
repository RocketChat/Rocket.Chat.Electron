import type { WebContents } from 'electron';
import { webContents } from 'electron';

import { listen } from '../../store';
import type { RootAction } from '../../store/actions';
import {
  CLEAR_CACHE_DIALOG_DELETE_LOGIN_AND_SEARCH_DATA_CLICKED,
  CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED,
  WEBVIEW_USER_LOGGED_IN,
} from '../../ui/actions';
import { getWebContentsByServerUrl } from '../../ui/main/serverView';
import {
  handleClearCacheDialog,
  handleUserLoggedOutDataClearing,
} from '../cache';

jest.mock('electron', () => ({
  webContents: {
    fromId: jest.fn(),
  },
}));

jest.mock('../../store', () => ({
  listen: jest.fn(),
}));

jest.mock('../../ui/main/serverView', () => ({
  getWebContentsByServerUrl: jest.fn(),
}));

describe('servers/cache handleUserLoggedOutDataClearing', () => {
  const mockListen = listen as unknown as jest.Mock<
    () => void,
    [string, (action: RootAction) => void]
  >;
  const mockGetWebContentsByServerUrl =
    getWebContentsByServerUrl as jest.MockedFunction<
      typeof getWebContentsByServerUrl
    >;

  const url = 'https://open.rocket.chat/';

  const createMockWebContents = (): WebContents =>
    ({
      session: {
        clearCache: jest.fn().mockResolvedValue(undefined),
        clearStorageData: jest.fn().mockResolvedValue(undefined),
      },
      reloadIgnoringCache: jest.fn(),
      executeJavaScript: jest.fn().mockResolvedValue([]),
    }) as unknown as WebContents;

  const dispatchUserLoggedIn = async (userLoggedIn: boolean) => {
    const [, listener] = mockListen.mock.calls.find(
      ([type]) => type === WEBVIEW_USER_LOGGED_IN
    )!;
    await listener({
      type: WEBVIEW_USER_LOGGED_IN,
      payload: { url, userLoggedIn },
    } as any);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handleUserLoggedOutDataClearing();
  });

  it('clears webview storage on a logged-in -> logged-out transition', async () => {
    const mockWebContents = createMockWebContents();
    mockGetWebContentsByServerUrl.mockReturnValue(mockWebContents);

    await dispatchUserLoggedIn(true);
    await dispatchUserLoggedIn(false);

    expect(mockGetWebContentsByServerUrl).toHaveBeenCalledWith(url);
    expect(mockWebContents.session.clearCache).toHaveBeenCalled();
    expect(mockWebContents.session.clearStorageData).toHaveBeenCalledWith();
    expect(mockWebContents.reloadIgnoringCache).toHaveBeenCalled();
  });

  it('does not clear on the initial logged-out state at startup/attach', async () => {
    const mockWebContents = createMockWebContents();
    mockGetWebContentsByServerUrl.mockReturnValue(mockWebContents);

    await dispatchUserLoggedIn(false);

    expect(mockGetWebContentsByServerUrl).not.toHaveBeenCalled();
    expect(mockWebContents.session.clearStorageData).not.toHaveBeenCalled();
  });

  it('does not clear on a logged-out -> logged-in transition', async () => {
    const mockWebContents = createMockWebContents();
    mockGetWebContentsByServerUrl.mockReturnValue(mockWebContents);

    await dispatchUserLoggedIn(false);
    await dispatchUserLoggedIn(true);

    expect(mockGetWebContentsByServerUrl).not.toHaveBeenCalled();
    expect(mockWebContents.session.clearStorageData).not.toHaveBeenCalled();
  });

  it('is a safe no-op when no webContents is found for the url', async () => {
    mockGetWebContentsByServerUrl.mockReturnValue(undefined);

    await dispatchUserLoggedIn(true);
    await expect(dispatchUserLoggedIn(false)).resolves.not.toThrow();

    expect(mockGetWebContentsByServerUrl).toHaveBeenCalledWith(url);
  });

  describe('local search opt-in of the users on this device', () => {
    it('keeps each opt-in that is on: reads it, clears all storage, writes it back, then reloads', async () => {
      const mockWebContents = createMockWebContents();
      const order: string[] = [];
      (mockWebContents.executeJavaScript as jest.Mock).mockImplementation(
        async (code: string) => {
          order.push(code.includes('setItem') ? 'restore' : 'read');
          return code.includes('setItem')
            ? undefined
            : ['E2EESearch_OptIn_QNd9RQ9oP3RspLaq3'];
        }
      );
      (
        mockWebContents.session.clearStorageData as jest.Mock
      ).mockImplementation(async () => {
        order.push('clear');
      });
      (mockWebContents.reloadIgnoringCache as jest.Mock).mockImplementation(
        () => {
          order.push('reload');
        }
      );
      mockGetWebContentsByServerUrl.mockReturnValue(mockWebContents);

      await dispatchUserLoggedIn(true);
      await dispatchUserLoggedIn(false);

      expect(order).toEqual(['read', 'clear', 'restore', 'reload']);
      expect(mockWebContents.session.clearStorageData).toHaveBeenCalledWith();
      const restore = (
        mockWebContents.executeJavaScript as jest.Mock
      ).mock.calls.find(([code]) => code.includes('setItem'))![0];
      expect(restore).toContain('E2EESearch_OptIn_QNd9RQ9oP3RspLaq3');
    });

    it('writes back only opt-in keys with a plain user id, never other keys', async () => {
      const mockWebContents = createMockWebContents();
      (mockWebContents.executeJavaScript as jest.Mock).mockImplementation(
        async (code: string) =>
          code.includes('setItem')
            ? undefined
            : [
                'Meteor.loginToken',
                "E2EESearch_OptIn_x');alert(1);('",
                'E2EESearch_OptIn_',
                42,
                'E2EESearch_OptIn_u1',
              ]
      );
      mockGetWebContentsByServerUrl.mockReturnValue(mockWebContents);

      await dispatchUserLoggedIn(true);
      await dispatchUserLoggedIn(false);

      const restore = (
        mockWebContents.executeJavaScript as jest.Mock
      ).mock.calls.find(([code]) => code.includes('setItem'))![0];
      expect(restore).toContain('E2EESearch_OptIn_u1');
      expect(restore).not.toContain('loginToken');
      expect(restore).not.toContain('alert');
    });

    it('still clears and reloads when the page cannot be read, and writes nothing back', async () => {
      const mockWebContents = createMockWebContents();
      (mockWebContents.executeJavaScript as jest.Mock).mockRejectedValue(
        new Error('page gone')
      );
      mockGetWebContentsByServerUrl.mockReturnValue(mockWebContents);

      await dispatchUserLoggedIn(true);
      await dispatchUserLoggedIn(false);

      expect(mockWebContents.session.clearStorageData).toHaveBeenCalledWith();
      expect(mockWebContents.reloadIgnoringCache).toHaveBeenCalled();
      expect(mockWebContents.executeJavaScript).toHaveBeenCalledTimes(1);
    });
  });
});

// "Delete login session" in the Clear cache dialog keeps the local search
// opt-in, unless the user also checks the box to remove the search data.
describe('servers/cache handleClearCacheDialog', () => {
  const mockListen = listen as unknown as jest.Mock<
    () => void,
    [string, (action: RootAction) => void]
  >;
  const mockFromId = webContents.fromId as jest.Mock;

  const createMockWebContents = (order: string[]): WebContents =>
    ({
      session: {
        clearCache: jest.fn().mockResolvedValue(undefined),
        clearStorageData: jest.fn().mockImplementation(async () => {
          order.push('clear');
        }),
      },
      reloadIgnoringCache: jest.fn().mockImplementation(() => {
        order.push('reload');
      }),
      executeJavaScript: jest.fn().mockImplementation(async (code: string) => {
        order.push(code.includes('setItem') ? 'restore' : 'read');
        return code.includes('setItem')
          ? undefined
          : ['E2EESearch_OptIn_QNd9RQ9oP3RspLaq3'];
      }),
    }) as unknown as WebContents;

  const dispatchAction = async (type: string, payload: number) => {
    const [, listener] = mockListen.mock.calls.find(([t]) => t === type)!;
    await listener({ type, payload } as any);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handleClearCacheDialog();
  });

  it('keeps the local search opt-in when it deletes the login data', async () => {
    const order: string[] = [];
    const guest = createMockWebContents(order);
    mockFromId.mockReturnValue(guest);

    await dispatchAction(CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED, 9);

    expect(mockFromId).toHaveBeenCalledWith(9);
    expect(order).toEqual(['read', 'clear', 'restore', 'reload']);
    const restore = (guest.executeJavaScript as jest.Mock).mock.calls.find(
      ([code]) => code.includes('setItem')
    )![0];
    expect(restore).toContain('E2EESearch_OptIn_QNd9RQ9oP3RspLaq3');
  });

  it('removes the local search opt-in too when the user asks for it', async () => {
    const order: string[] = [];
    const guest = createMockWebContents(order);
    mockFromId.mockReturnValue(guest);

    await dispatchAction(
      CLEAR_CACHE_DIALOG_DELETE_LOGIN_AND_SEARCH_DATA_CLICKED,
      9
    );

    expect(order).toEqual(['clear', 'reload']);
    expect(guest.session.clearStorageData).toHaveBeenCalledWith();
    expect(guest.executeJavaScript).not.toHaveBeenCalled();
  });
});
