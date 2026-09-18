/**
 * The video call window's preload is the bridge the web app talks to from the
 * conference page. Its shape is a cross-repo contract (@rocket.chat/desktop-api),
 * so the bridge name and surface are asserted here rather than left to the
 * coverage spec.
 */
const exposeInMainWorld = jest.fn();
const ipcInvoke = jest.fn(async (..._args: any[]) => undefined);
const ipcSend = jest.fn();
const ipcOnce = jest.fn();

jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (...args: any[]) => (exposeInMainWorld as any)(...args),
  },
  ipcRenderer: {
    invoke: (...args: any[]) => (ipcInvoke as any)(...args),
    send: (...args: any[]) => (ipcSend as any)(...args),
    once: (...args: any[]) => (ipcOnce as any)(...args),
    on: jest.fn(),
    sendSync: jest.fn(() => 'jitsi'),
  },
}));

jest.mock('../preload/jitsiBridge', () => ({}));

const loadBridge = () => {
  jest.resetModules();
  exposeInMainWorld.mockClear();
  require('../preload/index');
  const call = exposeInMainWorld.mock.calls.find(
    ([name]) => name === 'RocketChatDesktop'
  );
  return call?.[1]?.videoCall;
};

describe('video call window preload bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes its methods under RocketChatDesktop, not a second global', () => {
    const videoCall = loadBridge();

    expect(videoCall).toBeDefined();
    expect(exposeInMainWorld.mock.calls.map(([name]) => name)).not.toContain(
      'videoCallWindow'
    );
  });

  it('exposes only the three supported methods', () => {
    const videoCall = loadBridge();

    expect(Object.keys(videoCall).sort()).toEqual([
      'close',
      'openInMainWindow',
      'requestScreenSharing',
    ]);
  });

  // Removed deliberately: it handed the user's session token to whatever page
  // the webview had loaded, which is a third-party provider on the Jitsi/Pexip
  // paths. Nothing calls it. See CORE-2704.
  it('does not expose getAuthCredentials', () => {
    const videoCall = loadBridge();

    expect(videoCall.getAuthCredentials).toBeUndefined();
  });

  describe('openInMainWindow', () => {
    it('forwards in-app relative routes', () => {
      const videoCall = loadBridge();

      videoCall.openInMainWindow('/channel/general');

      expect(ipcInvoke).toHaveBeenCalledWith(
        'video-call-window/open-in-main-window',
        '/channel/general'
      );
    });

    it.each([
      ['an absolute URL', 'https://evil.example'],
      ['a protocol-relative URL', '//evil.example'],
      ['the backslash variant', '/\\evil.example'],
      ['a non-string', 42],
    ])('rejects %s', (_label, path) => {
      const videoCall = loadBridge();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      videoCall.openInMainWindow(path as any);

      expect(ipcInvoke).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  it('asks the main process to close the window', () => {
    const videoCall = loadBridge();

    videoCall.close();

    expect(ipcSend).toHaveBeenCalledWith('video-call-window/close');
  });

  it('resolves requestScreenSharing with the picked source id', async () => {
    const videoCall = loadBridge();
    ipcOnce.mockImplementation((channel: string, handler: any) => {
      if (channel === 'video-call-window/screen-sharing-source-responded') {
        queueMicrotask(() => handler({}, 'source-1'));
      }
    });

    await expect(videoCall.requestScreenSharing()).resolves.toBe('source-1');
    expect(ipcInvoke).toHaveBeenCalledWith(
      'video-call-window/open-screen-picker'
    );
  });
});
