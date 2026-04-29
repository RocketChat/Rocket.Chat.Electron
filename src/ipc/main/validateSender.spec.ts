import type { WebContents } from 'electron';

import { select } from '../../store';
import {
  isTrustedSender,
  registerWindowGetter,
  type SenderClass,
} from '../validateSender';

// jest.mock is hoisted by babel-jest so the mock is in place before imports run.
jest.mock('../../store', () => ({
  select: jest.fn(),
}));

const mockSelect = select as jest.MockedFunction<typeof select>;

const makeWebContents = (
  overrides: Partial<{
    id: number;
    type: string;
    url: string;
    destroyed: boolean;
    hostWebContents: WebContents | undefined;
  }> = {}
): WebContents => {
  const wc = {
    id: overrides.id ?? 1,
    getType: jest.fn(() => overrides.type ?? 'window'),
    getURL: jest.fn(() => overrides.url ?? 'file:///app/index.html'),
    isDestroyed: jest.fn(() => overrides.destroyed ?? false),
    hostWebContents: overrides.hostWebContents,
  } as unknown as WebContents;
  return wc;
};

beforeEach(() => {
  jest.resetModules();
  mockSelect.mockReset();
});

// ---------------------------------------------------------------------------
// server-webview
// ---------------------------------------------------------------------------

describe('isTrustedSender — server-webview', () => {
  const allow: SenderClass[] = ['server-webview'];

  it('accepts a webview whose origin matches a configured server', () => {
    const sender = makeWebContents({
      type: 'webview',
      url: 'https://chat.example.com/some/path',
    });
    mockSelect.mockReturnValue([{ url: 'https://chat.example.com/' }]);

    expect(isTrustedSender(sender, allow)).toBe(true);
  });

  it('rejects a webview whose origin does not match any server', () => {
    const sender = makeWebContents({
      type: 'webview',
      url: 'https://evil.example.com/',
    });
    mockSelect.mockReturnValue([{ url: 'https://chat.example.com/' }]);

    expect(isTrustedSender(sender, allow)).toBe(false);
  });

  it('rejects a non-webview (window type) even if URL matches a server', () => {
    const sender = makeWebContents({
      type: 'window',
      url: 'https://chat.example.com/',
    });
    mockSelect.mockReturnValue([{ url: 'https://chat.example.com/' }]);

    expect(isTrustedSender(sender, allow)).toBe(false);
  });

  it('rejects when server list is empty', () => {
    const sender = makeWebContents({
      type: 'webview',
      url: 'https://chat.example.com/',
    });
    mockSelect.mockReturnValue([]);

    expect(isTrustedSender(sender, allow)).toBe(false);
  });

  it('rejects when sender URL is not a valid URL', () => {
    const sender = makeWebContents({ type: 'webview', url: 'not-a-url' });
    mockSelect.mockReturnValue([{ url: 'https://chat.example.com/' }]);

    expect(isTrustedSender(sender, allow)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// log-viewer (local window class)
// ---------------------------------------------------------------------------

describe('isTrustedSender — log-viewer', () => {
  const allow: SenderClass[] = ['log-viewer'];

  const logViewerWc = makeWebContents({ id: 10, type: 'window' });

  beforeEach(() => {
    registerWindowGetter('log-viewer', () => logViewerWc);
  });

  it('accepts the exact log viewer WebContents', () => {
    expect(isTrustedSender(logViewerWc, allow)).toBe(true);
  });

  it('rejects a different WebContents with the same type', () => {
    const other = makeWebContents({ id: 99, type: 'window' });
    expect(isTrustedSender(other, allow)).toBe(false);
  });

  it('rejects when getter returns null (window not open)', () => {
    registerWindowGetter('log-viewer', () => null);
    const sender = makeWebContents({ id: 10, type: 'window' });
    expect(isTrustedSender(sender, allow)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// video-call (local window class — direct sender + hosted webview)
// ---------------------------------------------------------------------------

describe('isTrustedSender — video-call', () => {
  const allow: SenderClass[] = ['video-call'];

  const videoCallWc = makeWebContents({ id: 20, type: 'window' });

  beforeEach(() => {
    registerWindowGetter('video-call', () => videoCallWc);
  });

  it('accepts the video call window WebContents directly', () => {
    expect(isTrustedSender(videoCallWc, allow)).toBe(true);
  });

  it('accepts a webview whose hostWebContents is the video call window', () => {
    const hostedWebview = makeWebContents({
      id: 21,
      type: 'webview',
      url: 'https://jitsi.example.com/',
      hostWebContents: videoCallWc,
    });
    expect(isTrustedSender(hostedWebview, allow)).toBe(true);
  });

  it('rejects a webview hosted by a different window', () => {
    const otherWc = makeWebContents({ id: 30, type: 'window' });
    const hostedWebview = makeWebContents({
      id: 31,
      type: 'webview',
      url: 'https://jitsi.example.com/',
      hostWebContents: otherWc,
    });
    expect(isTrustedSender(hostedWebview, allow)).toBe(false);
  });

  it('rejects an unrelated sender', () => {
    const other = makeWebContents({ id: 99, type: 'window' });
    expect(isTrustedSender(other, allow)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// main-window (local window class — used by refresh-supported-versions)
// ---------------------------------------------------------------------------

describe('isTrustedSender — main-window', () => {
  const allow: SenderClass[] = ['main-window'];

  const mainWindowWc = makeWebContents({ id: 60, type: 'window' });

  beforeEach(() => {
    registerWindowGetter('main-window', () => mainWindowWc);
  });

  it('accepts the main window WebContents (refresh-supported-versions caller)', () => {
    expect(isTrustedSender(mainWindowWc, allow)).toBe(true);
  });

  it('rejects a server-webview sender that is not the main window', () => {
    const serverWebview = makeWebContents({
      id: 61,
      type: 'webview',
      url: 'https://chat.example.com/',
    });
    mockSelect.mockReturnValue([{ url: 'https://chat.example.com/' }]);
    expect(isTrustedSender(serverWebview, allow)).toBe(false);
  });

  it('rejects an unrelated window', () => {
    const other = makeWebContents({ id: 99, type: 'window' });
    expect(isTrustedSender(other, allow)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// log-viewer-window/get-server-tag — sent by server-webview preload
// ---------------------------------------------------------------------------

describe('isTrustedSender — log-viewer-window/get-server-tag allowlist', () => {
  const allow: SenderClass[] = ['server-webview'];

  it('accepts a server webview sender (preload context)', () => {
    const sender = makeWebContents({
      type: 'webview',
      url: 'https://chat.example.com/some/path',
    });
    mockSelect.mockReturnValue([{ url: 'https://chat.example.com/' }]);

    expect(isTrustedSender(sender, allow)).toBe(true);
  });

  it('rejects a log-viewer window sender for this channel', () => {
    const logViewerWc = makeWebContents({ id: 70, type: 'window' });
    registerWindowGetter('log-viewer', () => logViewerWc);

    expect(isTrustedSender(logViewerWc, allow)).toBe(false);
  });

  it('rejects a webview whose origin does not match any server', () => {
    const sender = makeWebContents({
      type: 'webview',
      url: 'https://evil.example.com/',
    });
    mockSelect.mockReturnValue([{ url: 'https://chat.example.com/' }]);

    expect(isTrustedSender(sender, allow)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// multi-class allow list
// ---------------------------------------------------------------------------

describe('isTrustedSender — multi-class allow list', () => {
  const videoCallWc = makeWebContents({ id: 40, type: 'window' });

  beforeEach(() => {
    registerWindowGetter('video-call', () => videoCallWc);
  });

  it('accepts if any class in the allow list matches', () => {
    const serverWebview = makeWebContents({
      id: 50,
      type: 'webview',
      url: 'https://chat.example.com/',
    });
    mockSelect.mockReturnValue([{ url: 'https://chat.example.com/' }]);

    expect(
      isTrustedSender(serverWebview, ['video-call', 'server-webview'])
    ).toBe(true);
  });

  it('rejects if no class in the allow list matches', () => {
    const stranger = makeWebContents({ id: 99, type: 'window' });
    mockSelect.mockReturnValue([]);

    expect(isTrustedSender(stranger, ['video-call', 'server-webview'])).toBe(
      false
    );
  });
});
