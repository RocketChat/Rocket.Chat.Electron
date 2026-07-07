/**
 * @jest-environment jsdom
 */
export {};

const invoke = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke,
  },
}));

describe('jitsi/preload', () => {
  const getSources = async (): Promise<
    Array<{
      id: string;
      name: string;
      display_id?: string;
      thumbnail: { toDataURL: () => string };
      appIcon: { toDataURL: () => string };
    }>
  > =>
    [
      {
        id: 'screen-1',
        name: 'Screen 1',
        display_id: 'd1',
        thumbnail: { toDataURL: () => 'thumb-data' },
        appIcon: { toDataURL: () => 'icon-data' },
      },
    ];

  beforeEach(() => {
    invoke.mockReset();
  });

  it('calls ipcRenderer.invoke with domain context', async () => {
    invoke.mockResolvedValue([]);

    const { desktopCapturer } = require('../preload');

    const sources = await desktopCapturer.getSources({ types: ['screen'] } as any);

    expect(invoke).toHaveBeenCalledWith('jitsi-desktop-capturer-get-sources', [
      { types: ['screen'] },
      expect.any(String),
    ]);
    expect(sources).toEqual([]);
  });

  it('transforms obtained sources before invoking callback', async () => {
    invoke.mockResolvedValue(await getSources());

    const { JitsiMeetElectron } = require('../preload');

    const callback = jest.fn();
    const errorCallback = jest.fn();

    await JitsiMeetElectron.obtainDesktopStreams(callback, errorCallback, { types: ['screen'] } as any);

    expect(errorCallback).not.toHaveBeenCalled();
    const transformed = callback.mock.calls[0][0][0] as {
      thumbnail: { toDataURL: () => string };
      appIcon: { toDataURL: () => string };
    };
    expect(transformed.thumbnail.toDataURL()).toBe('thumb-data');
    expect(transformed.appIcon.toDataURL()).toBe('icon-data');
  });

  it('forwards ipc errors to callback error handler', async () => {
    invoke.mockRejectedValue(new Error('denied'));

    const { JitsiMeetElectron } = require('../preload');

    const callback = jest.fn();
    const errorCallback = jest.fn();

    await JitsiMeetElectron.obtainDesktopStreams(callback, errorCallback, {} as any);

    expect(callback).not.toHaveBeenCalled();
    expect(errorCallback).toHaveBeenCalledWith(expect.any(Error));
  });
});
