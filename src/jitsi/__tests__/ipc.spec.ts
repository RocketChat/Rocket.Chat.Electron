import type { isJitsiServerAllowed as isJitsiServerAllowedType } from '../main';

const mockHandle = jest.fn();
const mockGetSources = jest.fn();

jest.mock('../../ipc/main', () => ({
  handle: (...args: unknown[]) => mockHandle(...args),
}));

jest.mock('../main', () => ({
  isJitsiServerAllowed: jest.fn(),
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

  let isJitsiServerAllowedMock: jest.MockedFunction<
    typeof isJitsiServerAllowedType
  >;

  beforeEach(async () => {
    jest.resetModules();
    mockHandle.mockClear();
    mockGetSources.mockReset();
    mockGetSources.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    const { isJitsiServerAllowed } = await import('../main');
    isJitsiServerAllowedMock = isJitsiServerAllowed as jest.MockedFunction<
      typeof isJitsiServerAllowedType
    >;
    isJitsiServerAllowedMock.mockResolvedValue({
      allowed: false,
      dontAskAgain: false,
    });

    const { handleJitsiDesktopCapturerGetSources } = await import('../ipc');
    handleJitsiDesktopCapturerGetSources();
  });

  it('returns no sources when first permission is denied', async () => {
    const handler = getHandler();
    const result = await handler({}, [{}, 'https://jitsi.example']);

    expect(isJitsiServerAllowedMock).toHaveBeenCalledWith(
      'https://jitsi.example'
    );
    expect(mockGetSources).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('requests sources after first permission allows', async () => {
    isJitsiServerAllowedMock.mockResolvedValueOnce({
      allowed: true,
      dontAskAgain: false,
    });

    const first = getHandler();
    await first({}, [{}, 'https://jitsi.example']);

    const second = getHandler();
    await second({}, [{}, 'https://jitsi.example']);

    expect(isJitsiServerAllowedMock).toHaveBeenCalledTimes(1);
    expect(mockGetSources).toHaveBeenCalled();
  });

  it('stays denied when dontAskAgain was previously set', async () => {
    isJitsiServerAllowedMock.mockResolvedValueOnce({
      allowed: false,
      dontAskAgain: true,
    });

    const first = getHandler();
    await first({}, [{}, 'https://jitsi.example']);

    const second = getHandler();
    await second({}, [{}, 'https://jitsi.example']);

    expect(isJitsiServerAllowedMock).toHaveBeenCalledTimes(1);
    expect(mockGetSources).not.toHaveBeenCalled();
  });
});
