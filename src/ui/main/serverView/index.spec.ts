import type { Event, Input, WebContents } from 'electron';

import { isProtocolAllowed } from '../../../navigation/main';
import { listen } from '../../../store';
import { openExternal } from '../../../utils/browserLauncher';
import { WEBVIEW_ATTACHED, WEBVIEW_READY } from '../../actions';
import { getRootWindow } from '../rootWindow';
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
  isWindowInAnyFullscreen: jest.fn(
    (window: {
      isFullScreen: () => boolean;
      isSimpleFullScreen: () => boolean;
    }) => window.isFullScreen() || window.isSimpleFullScreen()
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
    webviewReadyCallback = webviewReadyCall?.[1] as (
      action: unknown
    ) => void;

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
      willNavigateHandler(event, 'https://company.org/rocketchat/channel/general');
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
  });
});

describe('serverView before-input-event fullscreen handling', () => {
  const mockListen = listen as unknown as jest.Mock;
  const mockGetRootWindow = getRootWindow as jest.MockedFunction<
    typeof getRootWindow
  >;
  const originalPlatform = process.platform;

  let beforeInputEventHandler: (event: Event, input: Input) => void;
  let guestListeners: Map<string, (...args: any[]) => void>;
  let guestWebContents: {
    sendInputEvent: jest.Mock;
    executeJavaScript: jest.Mock;
  };
  let rootWindow: {
    isFullScreen: jest.Mock;
    isSimpleFullScreen: jest.Mock;
    isDestroyed: jest.Mock;
    webContents: {
      sendInputEvent: jest.Mock;
      addListener: jest.Mock;
      isDestroyed: jest.Mock;
    };
  };

  const setPlatform = (platform: NodeJS.Platform): void => {
    Object.defineProperty(process, 'platform', {
      value: platform,
      configurable: true,
    });
  };

  const createInput = (overrides: Partial<Input> = {}): Input =>
    ({
      type: 'keyDown',
      key: 'Escape',
      code: 'Escape',
      isAutoRepeat: false,
      isComposing: false,
      shift: false,
      control: false,
      alt: false,
      meta: false,
      location: 0,
      modifiers: [],
      ...overrides,
    }) as Input;

  const createEvent = (): Event =>
    ({ preventDefault: jest.fn() }) as unknown as Event;

  const attachGuest = async (): Promise<void> => {
    await attachGuestWebContentsEvents();

    const webviewAttachedCall = mockListen.mock.calls.find(
      ([actionType]) => actionType === WEBVIEW_ATTACHED
    );
    const webviewAttachedCallback = webviewAttachedCall?.[1] as (
      action: unknown
    ) => void;

    (
      jest.requireMock('electron').webContents.fromId as jest.Mock
    ).mockReturnValue(guestWebContents);

    webviewAttachedCallback({
      payload: { webContentsId: 1, url: 'https://open.rocket.chat' },
    });

    beforeInputEventHandler = guestListeners.get('before-input-event') as (
      event: Event,
      input: Input
    ) => void;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    setPlatform('darwin');

    guestListeners = new Map();
    rootWindow = {
      isFullScreen: jest.fn(() => true),
      isSimpleFullScreen: jest.fn(() => false),
      isDestroyed: jest.fn(() => false),
      webContents: {
        sendInputEvent: jest.fn(),
        addListener: jest.fn(),
        isDestroyed: jest.fn(() => false),
      },
    };
    mockGetRootWindow.mockResolvedValue(rootWindow as any);

    guestWebContents = {
      sendInputEvent: jest.fn(),
      executeJavaScript: jest.fn(() => Promise.resolve()),
    };

    Object.assign(guestWebContents, {
      addListener: jest.fn((event: string, handler: any) => {
        guestListeners.set(event, handler);
      }),
      on: jest.fn(),
      setWindowOpenHandler: jest.fn(),
      session: { on: jest.fn(), setPermissionRequestHandler: jest.fn() },
    });

    await attachGuest();
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  const enterHtmlFullscreen = (): void => {
    guestListeners.get('enter-html-full-screen')?.();
  };

  it('exits only the HTML5 fullscreen when Escape is pressed while a video is fullscreen', () => {
    enterHtmlFullscreen();

    const event = createEvent();
    beforeInputEventHandler(event, createInput());

    expect(event.preventDefault).toHaveBeenCalled();
    expect(guestWebContents.executeJavaScript).toHaveBeenCalledWith(
      expect.stringContaining('exitFullscreen')
    );
    expect(rootWindow.webContents.sendInputEvent).not.toHaveBeenCalled();
  });

  it('swallows auto-repeated Escapes in HTML5 fullscreen without re-running the exit', () => {
    enterHtmlFullscreen();

    beforeInputEventHandler(createEvent(), createInput());
    const event = createEvent();
    beforeInputEventHandler(event, createInput({ isAutoRepeat: true }));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(guestWebContents.executeJavaScript).toHaveBeenCalledTimes(1);
    expect(rootWindow.webContents.sendInputEvent).not.toHaveBeenCalled();
  });

  it('replays Escape into the guest instead of letting it reach the native window', () => {
    const event = createEvent();
    beforeInputEventHandler(event, createInput());

    expect(event.preventDefault).toHaveBeenCalled();
    expect(guestWebContents.sendInputEvent).toHaveBeenCalledWith({
      type: 'keyDown',
      keyCode: 'Escape',
      modifiers: [],
    });
    expect(guestWebContents.executeJavaScript).not.toHaveBeenCalled();
  });

  it('forwards the replayed Escape to the root window', () => {
    beforeInputEventHandler(createEvent(), createInput());
    guestWebContents.sendInputEvent.mockClear();

    const event = createEvent();
    beforeInputEventHandler(event, createInput());

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(guestWebContents.sendInputEvent).not.toHaveBeenCalled();
    expect(rootWindow.webContents.sendInputEvent).toHaveBeenCalledWith({
      type: 'keyDown',
      keyCode: 'Escape',
      modifiers: [],
    });
  });

  it('forwards Escape untouched when the window is not in fullscreen', () => {
    rootWindow.isFullScreen.mockReturnValue(false);

    const event = createEvent();
    beforeInputEventHandler(event, createInput());

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(guestWebContents.sendInputEvent).not.toHaveBeenCalled();
    expect(rootWindow.webContents.sendInputEvent).toHaveBeenCalledWith({
      type: 'keyDown',
      keyCode: 'Escape',
      modifiers: [],
    });
  });

  it('does not forward the Escape key up to the root window', () => {
    const event = createEvent();
    beforeInputEventHandler(event, createInput({ type: 'keyUp' }));

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(rootWindow.webContents.sendInputEvent).not.toHaveBeenCalled();
  });

  it('keeps forwarding both key down and key up of the shortcut key', () => {
    beforeInputEventHandler(createEvent(), createInput({ key: 'Meta' }));
    beforeInputEventHandler(
      createEvent(),
      createInput({ key: 'Meta', type: 'keyUp' })
    );

    expect(rootWindow.webContents.sendInputEvent).toHaveBeenNthCalledWith(1, {
      type: 'keyDown',
      keyCode: 'Meta',
      modifiers: [],
    });
    expect(rootWindow.webContents.sendInputEvent).toHaveBeenNthCalledWith(2, {
      type: 'keyUp',
      keyCode: 'Meta',
      modifiers: [],
    });
  });

  it('leaves HTML5 fullscreen to Chromium on other platforms', async () => {
    setPlatform('linux');
    await attachGuest();
    enterHtmlFullscreen();

    const event = createEvent();
    beforeInputEventHandler(event, createInput());

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(guestWebContents.executeJavaScript).not.toHaveBeenCalled();
    expect(guestWebContents.sendInputEvent).not.toHaveBeenCalled();
    expect(rootWindow.webContents.sendInputEvent).not.toHaveBeenCalled();
  });

  it('leaves Escape alone on other platforms', async () => {
    setPlatform('linux');
    await attachGuest();

    const event = createEvent();
    beforeInputEventHandler(event, createInput());

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(guestWebContents.sendInputEvent).not.toHaveBeenCalled();
    expect(rootWindow.webContents.sendInputEvent).toHaveBeenCalledWith({
      type: 'keyDown',
      keyCode: 'Escape',
      modifiers: [],
    });
  });
});
