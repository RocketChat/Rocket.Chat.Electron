import type { Event, WebContents } from 'electron';

import { isProtocolAllowed } from '../../../navigation/main';
import { listen } from '../../../store';
import { openExternal } from '../../../utils/browserLauncher';
import { WEBVIEW_READY } from '../../actions';
import { attachGuestWebContentsEvents } from './index';

jest.mock('electron', () => ({
  app: {
    userAgentFallback: 'test-agent',
    name: 'Rocket.Chat',
    getVersion: jest.fn(() => '1.0.0'),
  },
  clipboard: { writeText: jest.fn() },
  Menu: { buildFromTemplate: jest.fn(() => ({ popup: jest.fn() })) },
  webContents: { fromId: jest.fn() },
}));

jest.mock('../../../app/main/dev', () => ({
  setupPreloadReload: jest.fn(),
}));

jest.mock('../../../ipc/main', () => ({
  handle: jest.fn(),
}));

jest.mock('../../../navigation/main', () => ({
  isProtocolAllowed: jest.fn(),
}));

jest.mock('../../../screenSharing/serverViewScreenSharing', () => ({
  setupServerViewDisplayMedia: jest.fn(),
}));

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
  listen: jest.fn(),
  select: jest.fn(),
}));

jest.mock('../../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));

jest.mock('../mediaPermissions', () => ({
  handleMediaPermissionRequest: jest.fn(),
}));

jest.mock('../rootWindow', () => ({
  getRootWindow: jest.fn(() =>
    Promise.resolve({
      webContents: { addListener: jest.fn() },
    })
  ),
}));

jest.mock('./popupMenu', () => ({
  createPopupMenuForServerView: jest.fn(),
}));

describe('serverView attachGuestWebContentsEvents will-navigate guard', () => {
  const mockIsProtocolAllowed = isProtocolAllowed as jest.MockedFunction<
    typeof isProtocolAllowed
  >;
  const mockOpenExternal = openExternal as jest.MockedFunction<
    typeof openExternal
  >;
  const mockListen = listen as unknown as jest.Mock;

  let willNavigateHandler: (event: Event, url: string) => void;
  let webviewReadyCallback: (action: unknown) => void;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsProtocolAllowed.mockResolvedValue(true);

    await attachGuestWebContentsEvents();

    const webviewReadyCall = mockListen.mock.calls.find(
      ([actionType]) => actionType === WEBVIEW_READY
    );
    webviewReadyCallback = webviewReadyCall?.[1] as (action: unknown) => void;

    const guestWebContents = {
      addListener: jest.fn(),
      on: jest.fn((event: string, handler: any) => {
        if (event === 'will-navigate') {
          willNavigateHandler = handler;
        }
      }),
      setWindowOpenHandler: jest.fn(),
      session: { setPermissionRequestHandler: jest.fn() },
    } as unknown as WebContents;

    (
      jest.requireMock('electron').webContents.fromId as jest.Mock
    ).mockReturnValue(guestWebContents);

    webviewReadyCallback({
      payload: { webContentsId: 1, url: 'https://open.rocket.chat' },
    });
  });

  const createEvent = (): Event =>
    ({ preventDefault: jest.fn() }) as unknown as Event;

  it('allows same-origin http navigation', () => {
    webviewReadyCallback({
      payload: { webContentsId: 1, url: 'http://open.rocket.chat' },
    });
    const event = createEvent();
    willNavigateHandler(event, 'http://open.rocket.chat/page');
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('allows same-origin https navigation', () => {
    const event = createEvent();
    willNavigateHandler(event, 'https://open.rocket.chat/page');
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('denies file:// navigation and does not open externally', async () => {
    mockIsProtocolAllowed.mockResolvedValueOnce(false);
    const event = createEvent();
    willNavigateHandler(event, 'file:///etc/passwd');
    expect(event.preventDefault).toHaveBeenCalled();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockIsProtocolAllowed).toHaveBeenCalledWith('file:///etc/passwd');
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it('prevents in-app navigation and opens external markdown links externally when allowed', async () => {
    const event = createEvent();
    willNavigateHandler(event, 'https://github.com/RocketChat');

    expect(event.preventDefault).toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockIsProtocolAllowed).toHaveBeenCalledWith(
      'https://github.com/RocketChat'
    );
    expect(mockOpenExternal).toHaveBeenCalledWith(
      'https://github.com/RocketChat'
    );
  });

  it('still prevents and opens t.co links externally when allowed', async () => {
    const event = createEvent();
    willNavigateHandler(event, 'https://t.co/abc123');

    expect(event.preventDefault).toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockIsProtocolAllowed).toHaveBeenCalledWith('https://t.co/abc123');
    expect(mockOpenExternal).toHaveBeenCalledWith('https://t.co/abc123');
  });

  it('does not open externally when protocol is not allowed for external links', async () => {
    mockIsProtocolAllowed.mockResolvedValueOnce(false);
    const event = createEvent();
    willNavigateHandler(event, 'https://twitter.com/some/status');

    expect(event.preventDefault).toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it('prevents navigation and opens allowed custom schemes externally (e.g. mailto:)', async () => {
    const event = createEvent();
    willNavigateHandler(event, 'mailto:support@rocket.chat');

    expect(event.preventDefault).toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockIsProtocolAllowed).toHaveBeenCalledWith(
      'mailto:support@rocket.chat'
    );
    expect(mockOpenExternal).toHaveBeenCalledWith('mailto:support@rocket.chat');
  });

  it('safely handles invalid URLs', () => {
    const event = createEvent();
    willNavigateHandler(event, 'not-a-valid-url');
    expect(event.preventDefault).toHaveBeenCalled();
  });

  describe('subpath-hosted workspace handling', () => {
    beforeEach(() => {
      webviewReadyCallback({
        payload: { webContentsId: 1, url: 'https://company.org/rocketchat/' },
      });
    });

    it('allows navigation within the workspace subpath', () => {
      const event = createEvent();
      willNavigateHandler(
        event,
        'https://company.org/rocketchat/channel/general'
      );
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('intercepts and opens external same-domain paths outside the workspace subpath', async () => {
      const event = createEvent();
      willNavigateHandler(event, 'https://company.org/wiki/page');

      expect(event.preventDefault).toHaveBeenCalled();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockIsProtocolAllowed).toHaveBeenCalledWith(
        'https://company.org/wiki/page'
      );
      expect(mockOpenExternal).toHaveBeenCalledWith(
        'https://company.org/wiki/page'
      );
    });

    it('intercepts and opens links when protocol does not match (http vs https)', async () => {
      const event = createEvent();
      willNavigateHandler(
        event,
        'http://company.org/rocketchat/channel/general'
      );

      expect(event.preventDefault).toHaveBeenCalled();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockIsProtocolAllowed).toHaveBeenCalledWith(
        'http://company.org/rocketchat/channel/general'
      );
      expect(mockOpenExternal).toHaveBeenCalledWith(
        'http://company.org/rocketchat/channel/general'
      );
    });
  });
});
