import { checkScreenRecordingPermission } from '../screenRecordingPermission';

const getMediaAccessStatusMock = jest.fn();

jest.mock('electron', () => ({
  systemPreferences: {
    getMediaAccessStatus: (...args: unknown[]) =>
      getMediaAccessStatusMock(...args),
  },
}));

const setProcessPlatform = (platform: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
};

describe('screenSharing/screenRecordingPermission', () => {
  afterEach(() => {
    setProcessPlatform('darwin');
    getMediaAccessStatusMock.mockReset();
  });

  it('returns true on darwin when screen access is granted', async () => {
    setProcessPlatform('darwin');
    getMediaAccessStatusMock.mockReturnValue('granted');

    await expect(checkScreenRecordingPermission()).resolves.toBe(true);
    expect(getMediaAccessStatusMock).toHaveBeenCalledWith('screen');
  });

  it('returns false on darwin when screen access is not granted', async () => {
    setProcessPlatform('darwin');
    getMediaAccessStatusMock.mockReturnValue('denied');

    await expect(checkScreenRecordingPermission()).resolves.toBe(false);
  });

  it('returns true on non-darwin platforms without querying media permissions', async () => {
    setProcessPlatform('linux');

    await expect(checkScreenRecordingPermission()).resolves.toBe(true);
    expect(getMediaAccessStatusMock).not.toHaveBeenCalled();
  });
});
