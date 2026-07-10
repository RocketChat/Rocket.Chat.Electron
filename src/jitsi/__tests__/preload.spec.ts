/**
 * @jest-environment jsdom
 */
import { desktopCapturer, JitsiMeetElectron } from '../preload';

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

const { ipcRenderer } = jest.requireMock('electron') as {
  ipcRenderer: { invoke: jest.Mock };
};
const mockInvoke = ipcRenderer.invoke;

describe('jitsi/preload', () => {
  const getSources = async (): Promise<
    Array<{
      id: string;
      name: string;
      display_id?: string;
      thumbnail: { toDataURL: () => string };
      appIcon: { toDataURL: () => string };
    }>
  > => [
    {
      id: 'screen-1',
      name: 'Screen 1',
      display_id: 'd1',
      thumbnail: { toDataURL: () => 'thumb-data' },
      appIcon: { toDataURL: () => 'icon-data' },
    },
  ];

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('calls ipcRenderer.invoke with domain context', async () => {
    mockInvoke.mockResolvedValue([]);

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
    } as any);

    expect(mockInvoke).toHaveBeenCalledWith(
      'jitsi-desktop-capturer-get-sources',
      [{ types: ['screen'] }, expect.any(String)]
    );
    expect(sources).toEqual([]);
  });

  it('transforms obtained sources before invoking callback', async () => {
    mockInvoke.mockResolvedValue(await getSources());

    const callback = jest.fn();
    const errorCallback = jest.fn();

    await JitsiMeetElectron.obtainDesktopStreams(callback, errorCallback, {
      types: ['screen'],
    } as any);

    expect(errorCallback).not.toHaveBeenCalled();
    const transformed = callback.mock.calls[0][0][0] as {
      thumbnail: { toDataURL: () => string };
      appIcon: { toDataURL: () => string };
    };
    expect(transformed.thumbnail.toDataURL()).toBe('thumb-data');
    expect(transformed.appIcon.toDataURL()).toBe('icon-data');
  });

  it('forwards ipc errors to callback error handler', async () => {
    mockInvoke.mockRejectedValue(new Error('denied'));

    const callback = jest.fn();
    const errorCallback = jest.fn();

    await JitsiMeetElectron.obtainDesktopStreams(
      callback,
      errorCallback,
      {} as any
    );

    expect(callback).not.toHaveBeenCalled();
    expect(errorCallback).toHaveBeenCalledWith(expect.any(Error));
  });
});
