import { handleMediaPermissionRequest } from '../mediaPermissions';

const getMediaAccessStatusMock = jest.fn();
const askForMediaAccessMock = jest.fn();
const shellOpenExternalMock = jest.fn();
const askForMediaPermissionSettingsMock = jest.fn();

const setProcessPlatform = (value: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', {
    value,
    configurable: true,
  });
};

const resetPlatform = (): void => {
  setProcessPlatform('darwin');
};

jest.mock('electron', () => ({
  systemPreferences: {
    getMediaAccessStatus: (...args: any[]) => getMediaAccessStatusMock(...args),
    askForMediaAccess: (...args: any[]) => askForMediaAccessMock(...args),
  },
  shell: {
    openExternal: (...args: any[]) => shellOpenExternalMock(...args),
  },
}));

jest.mock('../dialogs', () => ({
  askForMediaPermissionSettings: (...args: any[]) =>
    askForMediaPermissionSettingsMock(...args),
}));

beforeEach(() => {
  resetPlatform();
  jest.clearAllMocks();
});

afterEach(() => {
  resetPlatform();
});

describe('ui/main/mediaPermissions', () => {
  it('allows media access on macOS when both statuses are granted', async () => {
    setProcessPlatform('darwin');
    getMediaAccessStatusMock
      .mockReturnValueOnce('granted')
      .mockReturnValueOnce('granted');

    const callback = jest.fn();

    await handleMediaPermissionRequest(
      ['audio', 'video'],
      null,
      'initiateCall',
      callback
    );

    expect(callback).toHaveBeenCalledWith(true);
    expect(askForMediaPermissionSettingsMock).not.toHaveBeenCalled();
    expect(shellOpenExternalMock).not.toHaveBeenCalled();
    expect(askForMediaAccessMock).not.toHaveBeenCalled();
  });

  it('opens macOS media settings when microphone and camera are denied', async () => {
    setProcessPlatform('darwin');
    const parentWindow = { isDestroyed: jest.fn(() => false), show: jest.fn() };
    getMediaAccessStatusMock
      .mockReturnValueOnce('denied')
      .mockReturnValueOnce('denied');
    askForMediaPermissionSettingsMock.mockResolvedValue(true);

    const callback = jest.fn();

    await handleMediaPermissionRequest(
      ['audio', 'video'],
      parentWindow as any,
      'answerCall',
      callback
    );

    expect(askForMediaPermissionSettingsMock).toHaveBeenCalledWith(
      'both',
      parentWindow
    );
    expect(shellOpenExternalMock).toHaveBeenCalledWith(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
    );
    expect(callback).toHaveBeenCalledWith(false);
  });

  it('asks for access when media status is not-determined on macOS', async () => {
    setProcessPlatform('darwin');
    getMediaAccessStatusMock.mockReturnValueOnce('not-determined');
    askForMediaAccessMock.mockResolvedValue(true);

    const callback = jest.fn();

    await handleMediaPermissionRequest(
      ['audio'],
      null,
      'recordMessage',
      callback
    );

    expect(askForMediaAccessMock).toHaveBeenCalledWith('microphone');
    expect(callback).toHaveBeenCalledWith(true);
  });

  it('asks for access when video status is not-determined on macOS', async () => {
    setProcessPlatform('darwin');
    getMediaAccessStatusMock.mockReturnValueOnce('not-determined');
    askForMediaAccessMock.mockResolvedValue(true);

    const callback = jest.fn();

    await handleMediaPermissionRequest(
      ['video'],
      null,
      'recordMessage',
      callback
    );

    expect(askForMediaAccessMock).toHaveBeenCalledWith('camera');
    expect(callback).toHaveBeenCalledWith(true);
  });

  it('opens microphone settings when only microphone is denied', async () => {
    setProcessPlatform('darwin');
    const parentWindow = { isDestroyed: jest.fn(() => false), show: jest.fn() };
    getMediaAccessStatusMock.mockReturnValueOnce('denied');
    askForMediaPermissionSettingsMock.mockResolvedValue(true);

    const callback = jest.fn();

    await handleMediaPermissionRequest(
      ['audio'],
      parentWindow as any,
      'answerCall',
      callback
    );

    expect(askForMediaPermissionSettingsMock).toHaveBeenCalledWith(
      'microphone',
      parentWindow
    );
    expect(shellOpenExternalMock).toHaveBeenCalledWith(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
    );
    expect(callback).toHaveBeenCalledWith(false);
  });

  it('logs when opening macOS media settings throws', async () => {
    setProcessPlatform('darwin');
    getMediaAccessStatusMock.mockReturnValueOnce('denied');
    askForMediaPermissionSettingsMock.mockRejectedValue(
      new Error('settings unavailable')
    );
    const parentWindow = { isDestroyed: jest.fn(() => false), show: jest.fn() };

    const warnMock = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const callback = jest.fn();

    await handleMediaPermissionRequest(
      ['audio'],
      parentWindow as any,
      'initiateCall',
      callback
    );

    expect(warnMock).toHaveBeenCalledWith(
      'Failed to open media permission settings dialog:',
      expect.any(Error)
    );
    expect(callback).toHaveBeenCalledWith(false);
    warnMock.mockRestore();
  });

  it('opens Windows media settings when camera permission is denied', async () => {
    setProcessPlatform('win32');
    getMediaAccessStatusMock.mockReturnValueOnce('denied');
    const parentWindow = { isDestroyed: jest.fn(() => false), show: jest.fn() };
    askForMediaPermissionSettingsMock.mockResolvedValue(true);

    const callback = jest.fn();

    await handleMediaPermissionRequest(
      ['video'],
      parentWindow as any,
      'recordMessage',
      callback
    );

    expect(askForMediaPermissionSettingsMock).toHaveBeenCalledWith(
      'camera',
      parentWindow as any
    );
    expect(shellOpenExternalMock).toHaveBeenCalledWith(
      'ms-settings:privacy-webcam'
    );
    expect(callback).toHaveBeenCalledWith(false);
    expect(askForMediaAccessMock).not.toHaveBeenCalled();
  });

  it('allows permissions on Linux without checking Electron media statuses', async () => {
    setProcessPlatform('linux');

    const callback = jest.fn();

    await handleMediaPermissionRequest(
      ['audio', 'video'],
      null,
      'initiateCall',
      callback
    );

    expect(callback).toHaveBeenCalledWith(true);
    expect(getMediaAccessStatusMock).not.toHaveBeenCalled();
    expect(askForMediaAccessMock).not.toHaveBeenCalled();
    expect(askForMediaPermissionSettingsMock).not.toHaveBeenCalled();
  });

  it('falls back to permissive behavior on unsupported platforms', async () => {
    setProcessPlatform('freebsd');

    const callback = jest.fn();

    await handleMediaPermissionRequest(
      ['audio'],
      null,
      'initiateCall',
      callback
    );

    expect(callback).toHaveBeenCalledWith(true);
    expect(getMediaAccessStatusMock).not.toHaveBeenCalled();
  });
});
