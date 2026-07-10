import type { WebContents } from 'electron';

import { listen } from '../../store';
import type { RootAction } from '../../store/actions';
import { WEBVIEW_USER_LOGGED_IN } from '../../ui/actions';
import { getWebContentsByServerUrl } from '../../ui/main/serverView';
import { handleUserLoggedOutDataClearing } from '../cache';

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
});
