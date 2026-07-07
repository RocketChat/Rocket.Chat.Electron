export {};

const mockHandle = jest.fn();
const mockGetSources = jest.fn();

const isJitsiServerAllowed = jest.fn();

jest.mock('../../ipc/main', () => ({
  handle: mockHandle,
}));

jest.mock('../main', () => ({
  isJitsiServerAllowed: (...args: unknown[]) => isJitsiServerAllowed(...args),
}));

jest.mock('electron', () => ({
  desktopCapturer: {
    getSources: (...args: unknown[]) => mockGetSources(...args),
  },
}));

describe('jitsi/ipc', () => {
  const getHandler = (): ((
    _event: unknown,
    args: [unknown, string]
  ) => Promise<unknown> | unknown[]) => {
    const callback = mockHandle.mock.calls[0]?.[1];
    return callback as (
      _event: unknown,
      args: [unknown, string]
    ) => Promise<unknown> | unknown[];
  };

  beforeEach(() => {
    jest.resetModules();
    mockHandle.mockClear();
    mockGetSources.mockReset();
    isJitsiServerAllowed.mockReset();
    isJitsiServerAllowed.mockResolvedValue({
      allowed: false,
      dontAskAgain: false,
    });
    mockGetSources.mockResolvedValue([
      { id: 'a' },
      { id: 'b' },
    ]);

    const { handleJitsiDesktopCapturerGetSources } = require('../ipc');
    handleJitsiDesktopCapturerGetSources();
  });

  it('returns no sources when first permission is denied', async () => {
    const handler = getHandler();
    const result = await handler({}, [{}, 'https://jitsi.example']);

    expect(isJitsiServerAllowed).toHaveBeenCalledWith('https://jitsi.example');
    expect(mockGetSources).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('requests sources after first permission allows', async () => {
    isJitsiServerAllowed.mockResolvedValueOnce({
      allowed: true,
      dontAskAgain: false,
    });

    const first = getHandler();
    await first({}, [{}, 'https://jitsi.example']);

    const second = getHandler();
    await second({}, [{}, 'https://jitsi.example']);

    expect(isJitsiServerAllowed).toHaveBeenCalledTimes(1);
    expect(mockGetSources).toHaveBeenCalled();
  });

  it('stays denied when dontAskAgain was previously set', async () => {
    isJitsiServerAllowed.mockResolvedValueOnce({
      allowed: false,
      dontAskAgain: true,
    });

    const first = getHandler();
    await first({}, [{}, 'https://jitsi.example']);

    const second = getHandler();
    await second({}, [{}, 'https://jitsi.example']);

    expect(isJitsiServerAllowed).toHaveBeenCalledTimes(1);
    expect(mockGetSources).not.toHaveBeenCalled();
  });
});
