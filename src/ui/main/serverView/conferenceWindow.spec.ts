import type { WebContents } from 'electron';

import { handle } from '../../../ipc/main';
import { dispatch, listen } from '../../../store';
import { WEBVIEW_ATTACHED, WEBVIEW_DID_NAVIGATE } from '../../actions';
import {
  isConferenceCallPageUrl,
  requestConferenceWindow,
  takePendingConferenceUrl,
} from './conferenceWindow';
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

jest.mock('../../../servers/bootWatchdog', () => ({
  attachBootWatchdog: jest.fn(),
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
      webContents: { addListener: jest.fn(), send: jest.fn() },
    })
  ),
}));

jest.mock('./popupMenu', () => ({
  createPopupMenuForServerView: jest.fn(),
}));

const serverUrl = 'https://chat.example.com/';

const flushImmediate = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const createServerWebContents = () => {
  const listeners = new Map<string, (...args: any[]) => void>();
  const serverWebContents = {
    addListener: jest.fn((event: string, listener: any) => {
      listeners.set(event, listener);
    }),
    session: { on: jest.fn(), removeAllListeners: jest.fn() },
    navigationHistory: {
      canGoBack: jest.fn(() => true),
      goBack: jest.fn(),
    },
    loadURL: jest.fn(() => Promise.resolve()),
    send: jest.fn(),
    isDestroyed: jest.fn(() => false),
  };
  return { serverWebContents, listeners };
};

describe('isConferenceCallPageUrl', () => {
  it('matches conference pages that host the call', () => {
    expect(
      isConferenceCallPageUrl(`${serverUrl}conference/abc`, serverUrl)
    ).toBe(true);
    expect(
      isConferenceCallPageUrl(
        `${serverUrl}conference/abc?scheduled=true`,
        serverUrl
      )
    ).toBe(true);
  });

  it('leaves the callUrl redirect page and other pages alone', () => {
    expect(
      isConferenceCallPageUrl(
        `${serverUrl}conference/abc?callUrl=https://meet.example.com/x`,
        serverUrl
      )
    ).toBe(false);
    expect(isConferenceCallPageUrl(`${serverUrl}home`, serverUrl)).toBe(false);
  });
});

describe('conference window requests', () => {
  it('hands the queued conference to its server exactly once', () => {
    const { serverWebContents } = createServerWebContents();

    requestConferenceWindow(
      serverUrl,
      serverWebContents as unknown as WebContents,
      `${serverUrl}conference/abc`
    );

    expect(serverWebContents.send).toHaveBeenCalledWith(
      'server-view/conference-requested'
    );
    expect(takePendingConferenceUrl('https://other.example.com/')).toBeNull();
    expect(takePendingConferenceUrl(undefined)).toBeNull();
    expect(takePendingConferenceUrl(serverUrl)).toBe(
      `${serverUrl}conference/abc`
    );
    expect(takePendingConferenceUrl(serverUrl)).toBeNull();
  });

  it('keeps the request queued when the server view is gone', () => {
    const { serverWebContents } = createServerWebContents();
    serverWebContents.isDestroyed.mockReturnValue(true);

    requestConferenceWindow(
      serverUrl,
      serverWebContents as unknown as WebContents,
      `${serverUrl}conference/abc`
    );

    expect(serverWebContents.send).not.toHaveBeenCalled();
    expect(takePendingConferenceUrl(serverUrl)).toBe(
      `${serverUrl}conference/abc`
    );
  });
});

describe('server view conference guard', () => {
  const listenMock = listen as unknown as jest.Mock;
  const dispatchMock = dispatch as unknown as jest.Mock;
  const handleMock = handle as unknown as jest.Mock;

  let serverWebContents: ReturnType<
    typeof createServerWebContents
  >['serverWebContents'];
  let listeners: Map<string, (...args: any[]) => void>;

  const takePending = (webContents: unknown): Promise<string | null> => {
    const call = handleMock.mock.calls.find(
      ([channel]) => channel === 'server-view/take-pending-conference'
    );
    if (!call) throw new Error('take-pending-conference handler missing');
    return call[1](webContents);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ serverWebContents, listeners } = createServerWebContents());

    await attachGuestWebContentsEvents();

    (
      jest.requireMock('electron').webContents.fromId as jest.Mock
    ).mockReturnValue(serverWebContents);

    const attached = listenMock.mock.calls.find(
      ([actionType]) => actionType === WEBVIEW_ATTACHED
    )?.[1] as (action: unknown) => void;
    attached({ payload: { url: serverUrl, webContentsId: 1 } });
  });

  it('moves an in-page navigation to a conference call page out of the server view', async () => {
    const pageUrl = `${serverUrl}conference/abc`;

    listeners.get('did-navigate-in-page')?.({}, pageUrl, true, 1, 1);

    expect(serverWebContents.send).toHaveBeenCalledWith(
      'server-view/conference-requested'
    );
    await expect(takePending(serverWebContents)).resolves.toBe(pageUrl);
    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: WEBVIEW_DID_NAVIGATE })
    );

    await flushImmediate();
    expect(serverWebContents.navigationHistory.goBack).toHaveBeenCalled();
    expect(serverWebContents.loadURL).not.toHaveBeenCalled();
  });

  it('loads the server home when there is no page to go back to', async () => {
    serverWebContents.navigationHistory.canGoBack.mockReturnValue(false);

    listeners.get('did-navigate')?.(
      {},
      `${serverUrl}conference/abc?scheduled=true`
    );

    await flushImmediate();
    expect(serverWebContents.navigationHistory.goBack).not.toHaveBeenCalled();
    expect(serverWebContents.loadURL).toHaveBeenCalledWith(serverUrl);
    await expect(takePending(serverWebContents)).resolves.toBe(
      `${serverUrl}conference/abc?scheduled=true`
    );
  });

  it('ignores conference navigations inside subframes', async () => {
    listeners.get('did-navigate-in-page')?.(
      {},
      `${serverUrl}conference/abc`,
      false,
      1,
      2
    );

    await flushImmediate();
    expect(serverWebContents.send).not.toHaveBeenCalled();
    expect(serverWebContents.navigationHistory.goBack).not.toHaveBeenCalled();
  });

  it('keeps the callUrl redirect page and ordinary routes in the server view', async () => {
    listeners.get('did-navigate-in-page')?.(
      {},
      `${serverUrl}conference/abc?callUrl=https://meet.example.com/x`,
      true,
      1,
      1
    );
    listeners.get('did-navigate-in-page')?.(
      {},
      `${serverUrl}channel/general`,
      true,
      1,
      1
    );
    listeners.get('did-navigate')?.({}, `${serverUrl}home`);

    await flushImmediate();
    expect(serverWebContents.send).not.toHaveBeenCalled();
    expect(serverWebContents.navigationHistory.goBack).not.toHaveBeenCalled();
    expect(serverWebContents.loadURL).not.toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_DID_NAVIGATE,
      payload: { url: serverUrl, pageUrl: `${serverUrl}channel/general` },
    });
  });

  it('does not navigate a server view destroyed before the move runs', async () => {
    listeners.get('did-navigate-in-page')?.(
      {},
      `${serverUrl}conference/abc`,
      true,
      1,
      1
    );
    serverWebContents.isDestroyed.mockReturnValue(true);

    await flushImmediate();
    expect(serverWebContents.navigationHistory.goBack).not.toHaveBeenCalled();
    expect(serverWebContents.loadURL).not.toHaveBeenCalled();
  });
});
