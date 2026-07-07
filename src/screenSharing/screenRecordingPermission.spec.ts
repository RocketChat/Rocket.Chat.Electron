const getMediaAccessStatusMock = jest.fn();

jest.mock('electron', () => ({
  systemPreferences: {
    getMediaAccessStatus: (...args: any[]) => getMediaAccessStatusMock(...args),
  },
}));

import { checkScreenRecordingPermission } from './screenRecordingPermission';

const setProcessPlatform = (value: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', {
    value,
    configurable: true,
  });
};

const resetProcessPlatform = (): void => {
  setProcessPlatform(process.platform);
};

beforeEach(() => {
  getMediaAccessStatusMock.mockReset();
  resetProcessPlatform();
});

describe('screenRecordingPermission', () => {
  it('returns granted when platform is darwin and permission is granted', async () => {
    setProcessPlatform('darwin');
    getMediaAccessStatusMock.mockReturnValue('granted');

    expect(await checkScreenRecordingPermission()).toBe(true);
    expect(getMediaAccessStatusMock).toHaveBeenCalledWith('screen');
  });

  it('returns denied when platform is darwin and permission is denied', async () => {
    setProcessPlatform('darwin');
    getMediaAccessStatusMock.mockReturnValue('denied');

    expect(await checkScreenRecordingPermission()).toBe(false);
  });

  it('returns true without checking Electron permission on non-darwin', async () => {
    setProcessPlatform('linux');
    expect(await checkScreenRecordingPermission()).toBe(true);
    expect(getMediaAccessStatusMock).not.toHaveBeenCalled();
  });
});
