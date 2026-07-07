import type { BrowserWindow } from 'electron';

import { getRootWindow } from './rootWindow';
import {
  AskForCertificateTrustResponse,
  AskUpdateInstallResponse,
  askForAppDataReset,
  askForServerAddition,
  askUpdateInstall,
  askForCertificateTrust,
  askForOpeningExternalProtocol,
  askForJitsiCaptureScreenPermission,
  askForClearScreenCapturePermission,
  askForMediaPermissionSettings,
  warnAboutInvalidServerUrl,
  warnAboutUpdateDownload,
  warnAboutUpdateSkipped,
  warnAboutInstallUpdateLater,
  showMicrophonePermissionDeniedMessage,
} from './dialogs';

import { dialog, shell } from 'electron';

jest.mock('electron', () => ({
  dialog: {
    showMessageBox: jest.fn(),
  },
  shell: {
    openExternal: jest.fn(),
  },
}));

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

jest.mock('./rootWindow', () => ({
  getRootWindow: jest.fn(),
}));

const showMessageBox = dialog.showMessageBox as jest.MockedFunction<
  typeof dialog.showMessageBox
>;
const getRootWindowMock = getRootWindow as jest.MockedFunction<typeof getRootWindow>;
const openExternalMock = shell.openExternal as jest.MockedFunction<
  typeof shell.openExternal
>;

const getMockWindow = (): BrowserWindow =>
  ({ show: jest.fn() } as unknown as BrowserWindow);

describe('ui/main/dialogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRootWindowMock.mockResolvedValue(getMockWindow());
  });

  it('asks for app data reset and maps the response', async () => {
    const parent = getMockWindow();
    showMessageBox.mockResolvedValue({ response: 0 } as never);

    await expect(askForAppDataReset(parent)).resolves.toBe(true);
    expect(parent.show).toHaveBeenCalledTimes(1);
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({ defaultId: 1 })
    );

    showMessageBox.mockResolvedValue({ response: 1 } as never);
    await expect(askForAppDataReset()).resolves.toBe(false);
    expect(getRootWindowMock).toHaveBeenCalledTimes(1);
  });

  it('asks for server addition and maps the response', async () => {
    showMessageBox.mockResolvedValue({ response: 0 } as never);
    const parent = getMockWindow();

    await expect(askForServerAddition('https://example.test', parent)).resolves.toBe(
      true
    );
    expect(parent.show).toHaveBeenCalledTimes(1);
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({ message: 'dialog.addServer.message' })
    );
  });

  it('uses root window when no parent is passed for server addition', async () => {
    const rootWindow = getMockWindow();
    getRootWindowMock.mockResolvedValue(rootWindow);
    showMessageBox.mockResolvedValue({ response: 1 } as never);

    await expect(
      askForServerAddition('https://example.test')
    ).resolves.toBe(false);
    expect(showMessageBox).toHaveBeenCalledWith(
      rootWindow,
      expect.objectContaining({ message: 'dialog.addServer.message' })
    );
  });

  it('updates install answer mapping', async () => {
    showMessageBox.mockResolvedValue({ response: 1 } as never);
    await expect(askUpdateInstall()).resolves.toBe(
      AskUpdateInstallResponse.INSTALL_NOW
    );

    showMessageBox.mockResolvedValue({ response: 2 } as never);
    await expect(askUpdateInstall()).resolves.toBe(
      AskUpdateInstallResponse.INSTALL_LATER
    );
  });

  it('uses the provided parent window for update install prompt', async () => {
    const parent = getMockWindow();
    showMessageBox.mockResolvedValue({ response: 1 } as never);

    await expect(askUpdateInstall(parent)).resolves.toBe(
      AskUpdateInstallResponse.INSTALL_NOW
    );
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({ type: 'question' })
    );
  });

  it('warns about invalid server URLs by throwing', async () => {
    expect(() => warnAboutInvalidServerUrl('x', 'y')).toThrow('not implemented');
  });

  it('asks for certificate trust and maps yes/no', async () => {
    showMessageBox.mockResolvedValue({ response: 0, checkboxChecked: false } as never);
    await expect(askForCertificateTrust('CA', 'detail')).resolves.toBe(
      AskForCertificateTrustResponse.YES
    );

    showMessageBox.mockResolvedValue({ response: 1, checkboxChecked: true } as never);
    await expect(askForCertificateTrust('CA', 'detail')).resolves.toBe(
      AskForCertificateTrustResponse.NO
    );
  });

  it('uses the provided parent window for certificate trust prompt', async () => {
    const parent = getMockWindow();
    showMessageBox.mockResolvedValue({ response: 1, checkboxChecked: false } as never);

    await expect(askForCertificateTrust('CA', 'detail', parent)).resolves.toBe(
      AskForCertificateTrustResponse.NO
    );
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({ title: 'dialog.certificateError.title' })
    );
  });

  it('asks for external protocol permission with checkbox result', async () => {
    showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: true,
    } as never);

    const result = await askForOpeningExternalProtocol(new URL('custom://test'));
    expect(result).toEqual({ allowed: true, dontAskAgain: true });
  });

  it('uses parent window for external protocol permission prompt', async () => {
    const parent = getMockWindow();
    const url = new URL('custom://test');
    showMessageBox.mockResolvedValue({
      response: 1,
      checkboxChecked: false,
    } as never);

    const result = await askForOpeningExternalProtocol(url, parent);
    expect(result).toEqual({ allowed: false, dontAskAgain: false });
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({
        detail: 'dialog.openingExternalProtocol.detail',
      })
    );
  });

  it('asks for Jitsi capture screen permission with checkbox result', async () => {
    showMessageBox.mockResolvedValue({
      response: 1,
      checkboxChecked: false,
    } as never);

    const result = await askForJitsiCaptureScreenPermission(
      new URL('https://call.example')
    );
    expect(result).toEqual({ allowed: false, dontAskAgain: false });
  });

  it('uses parent window for Jitsi capture screen permission prompt', async () => {
    const parent = getMockWindow();
    showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: true,
    } as never);

    const result = await askForJitsiCaptureScreenPermission(
      new URL('https://call.example'),
      parent
    );
    expect(result).toEqual({ allowed: true, dontAskAgain: true });
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({
        detail: 'dialog.allowVideoCallCaptureScreen.detail',
      })
    );
  });

  it('asks for clear screen-capture permission and maps the response', async () => {
    showMessageBox.mockResolvedValue({ response: 0 } as never);

    await expect(askForClearScreenCapturePermission()).resolves.toBe(true);
    showMessageBox.mockResolvedValue({ response: 2 } as never);
    await expect(askForClearScreenCapturePermission()).resolves.toBe(false);
  });

  it('uses parent window for clear screen-capture permission prompt', async () => {
    const parent = getMockWindow();
    showMessageBox.mockResolvedValue({ response: 1 } as never);

    await expect(askForClearScreenCapturePermission(parent)).resolves.toBe(false);
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({
        message: 'dialog.clearPermittedScreenCaptureServers.message',
      })
    );
  });

  it('prompts for media permission settings and maps yes/no', async () => {
    showMessageBox.mockResolvedValue({ response: 0 } as never);

    await expect(
      askForMediaPermissionSettings('microphone')
    ).resolves.toBe(true);
    await expect(
      askForMediaPermissionSettings('both', getMockWindow())
    ).resolves.toBe(true);
  });

  it('maps a negative answer for media permission settings', async () => {
    showMessageBox.mockResolvedValue({ response: 1 } as never);

    await expect(
      askForMediaPermissionSettings('camera')
    ).resolves.toBe(false);
  });

  it('opens macOS microphone settings when allowed on darwin', async () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: 'darwin' });
    showMessageBox.mockResolvedValue({ response: 0 } as never);

    await showMicrophonePermissionDeniedMessage('initiateCall');
    expect(openExternalMock).toHaveBeenCalledWith(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
    );
  });

  it('opens Windows microphone settings when allowed on win32', async () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
    showMessageBox.mockResolvedValue({ response: 0 } as never);

    await showMicrophonePermissionDeniedMessage('answerCall');
    expect(openExternalMock).toHaveBeenCalledWith('ms-settings:privacy-microphone');
  });

  it('does not open settings when microphone permission is denied', async () => {
    showMessageBox.mockResolvedValue({ response: 1 } as never);

    await showMicrophonePermissionDeniedMessage('recordMessage');
    expect(openExternalMock).not.toHaveBeenCalled();
  });

  it('uses the parent window and does not open OS settings for unsupported platforms', async () => {
    const parent = getMockWindow();
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: 'linux',
    });
    showMessageBox.mockResolvedValue({ response: 0 } as never);

    await showMicrophonePermissionDeniedMessage('answerCall', parent);
    expect(parent.show).toHaveBeenCalledTimes(1);
    expect(openExternalMock).not.toHaveBeenCalled();
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: originalPlatform,
    });
  });

  it('shows update download and skip informational dialogs', async () => {
    showMessageBox.mockResolvedValue({ response: 0 } as never);

    await warnAboutUpdateDownload();
    await warnAboutUpdateSkipped();
    await warnAboutInstallUpdateLater();
    expect(showMessageBox).toHaveBeenCalledTimes(3);
  });

  it('uses parent window for informational update dialogs', async () => {
    const parent = getMockWindow();
    showMessageBox.mockResolvedValue({ response: 0 } as never);

    await warnAboutUpdateDownload(parent);
    await warnAboutUpdateSkipped(parent);
    await warnAboutInstallUpdateLater(parent);
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({ buttons: ['dialog.updateDownloading.ok'] })
    );
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({ buttons: ['dialog.updateSkip.ok'] })
    );
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({ buttons: ['dialog.updateInstallLater.ok'] })
    );
  });
});
