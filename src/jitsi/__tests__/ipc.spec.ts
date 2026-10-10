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

  const sourcesAllowedFirst = async (): Promise<void> => {
    isJitsiServerAllowedMock.mockResolvedValueOnce({
      allowed: true,
      dontAskAgain: false,
    });
    await getHandler()({}, [{}, 'https://jitsi.example']);
  };

  it('replaces a zero-sized thumbnailSize with a safe size', async () => {
    // jitsi-meet requests `{width: 0, height: 0}` when it does not need
    // thumbnails; zero sizes crash the PipeWire-backed capturer on Wayland
    // (electron#47591) — the setup of issue #2823.
    await sourcesAllowedFirst();
    await getHandler()({}, [
      { types: ['screen'], thumbnailSize: { width: 0, height: 0 } },
      'https://jitsi.example',
    ]);

    expect(mockGetSources).toHaveBeenLastCalledWith({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 },
    });
  });

  it('clamps invalid and oversized thumbnail dimensions', async () => {
    await sourcesAllowedFirst();
    await getHandler()({}, [
      {
        types: ['window'],
        thumbnailSize: { width: -5, height: 9999999 },
      },
      'https://jitsi.example',
    ]);

    expect(mockGetSources).toHaveBeenLastCalledWith({
      types: ['window'],
      thumbnailSize: { width: 1, height: 512 },
    });
  });

  it('keeps valid options untouched', async () => {
    await sourcesAllowedFirst();
    const options = {
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    };
    await getHandler()({}, [options, 'https://jitsi.example']);

    expect(mockGetSources).toHaveBeenLastCalledWith({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    });
  });

  it('falls back to safe defaults for malformed options', async () => {
    await sourcesAllowedFirst();

    await getHandler()({}, [
      { types: ['printer', 'audio'], thumbnailSize: 'junk' },
      'https://jitsi.example',
    ]);
    expect(mockGetSources).toHaveBeenLastCalledWith({
      types: ['screen', 'window'],
    });

    await getHandler()({}, [null, 'https://jitsi.example']);
    expect(mockGetSources).toHaveBeenLastCalledWith({
      types: ['screen', 'window'],
    });
  });
});
