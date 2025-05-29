import type { BrowserWindow } from 'electron';
import { dialog } from 'electron';
import i18next from 'i18next';

import { getRootWindow } from './rootWindow';

const t = i18next.t.bind(i18next);

export const askForAppDataReset = async (
  parentWindow?: BrowserWindow
): Promise<boolean> => {
  parentWindow?.show();

  const { response } = await dialog.showMessageBox(
    parentWindow ?? (await getRootWindow()),
    {
      type: 'question',
      buttons: [t('dialog.resetAppData.yes'), t('dialog.resetAppData.cancel')],
      defaultId: 1,
      title: t('dialog.resetAppData.title'),
      message: t('dialog.resetAppData.message'),
    }
  );

  return response === 0;
};

export const askForServerAddition = async (
  serverUrl: string,
  parentWindow?: BrowserWindow
): Promise<boolean> => {
  parentWindow?.show();

  const { response } = await dialog.showMessageBox(
    parentWindow ?? (await getRootWindow()),
    {
      type: 'question',
      buttons: [t('dialog.addServer.add'), t('dialog.addServer.cancel')],
      defaultId: 0,
      title: t('dialog.addServer.title'),
      message: t('dialog.addServer.message', { host: serverUrl }),
    }
  );

  return response === 0;
};

export const warnAboutInvalidServerUrl = (
  _serverUrl: string,
  _reason: string,
  _parentWindow?: BrowserWindow
): Promise<void> => {
  // TODO
  throw Error('not implemented');
};

export const enum AskUpdateInstallResponse {
  INSTALL_LATER = 0,
  INSTALL_NOW = 1,
}

export const askUpdateInstall = async (
  parentWindow?: BrowserWindow
): Promise<AskUpdateInstallResponse> => {
  const { response } = await dialog.showMessageBox(
    parentWindow ?? (await getRootWindow()),
    {
      type: 'question',
      title: t('dialog.updateReady.title'),
      message: t('dialog.updateReady.message'),
      buttons: [
        t('dialog.updateReady.installLater'),
        t('dialog.updateReady.installNow'),
      ],
      defaultId: 1,
    }
  );

  if (response === 1) {
    return AskUpdateInstallResponse.INSTALL_NOW;
  }

  return AskUpdateInstallResponse.INSTALL_LATER;
};

export const warnAboutInstallUpdateLater = async (
  parentWindow?: BrowserWindow
): Promise<void> => {
  await dialog.showMessageBox(parentWindow ?? (await getRootWindow()), {
    type: 'info',
    title: t('dialog.updateInstallLater.title'),
    message: t('dialog.updateInstallLater.message'),
    buttons: [t('dialog.updateInstallLater.ok')],
    defaultId: 0,
  });
};

export enum AskForCertificateTrustResponse {
  YES = 0,
  NO = 1,
}

export const askForCertificateTrust = async (
  issuerName: string,
  detail: string,
  parentWindow?: BrowserWindow
): Promise<AskForCertificateTrustResponse> => {
  const { response } = await dialog.showMessageBox(
    parentWindow ?? (await getRootWindow()),
    {
      title: t('dialog.certificateError.title'),
      message: t('dialog.certificateError.message', { issuerName }),
      detail,
      type: 'warning',
      buttons: [
        t('dialog.certificateError.yes'),
        t('dialog.certificateError.no'),
      ],
      cancelId: 1,
      defaultId: 1,
    }
  );

  if (response === 0) {
    return AskForCertificateTrustResponse.YES;
  }

  return AskForCertificateTrustResponse.NO;
};

export const warnAboutUpdateDownload = async (
  parentWindow?: BrowserWindow
): Promise<void> => {
  await dialog.showMessageBox(parentWindow ?? (await getRootWindow()), {
    type: 'info',
    title: t('dialog.updateDownloading.title'),
    message: t('dialog.updateDownloading.message'),
    buttons: [t('dialog.updateDownloading.ok')],
    defaultId: 0,
  });
};

export const warnAboutUpdateSkipped = async (
  parentWindow?: BrowserWindow
): Promise<void> => {
  await dialog.showMessageBox(parentWindow ?? (await getRootWindow()), {
    type: 'warning',
    title: t('dialog.updateSkip.title'),
    message: t('dialog.updateSkip.message'),
    buttons: [t('dialog.updateSkip.ok')],
    defaultId: 0,
  });
};

export const askForOpeningExternalProtocol = async (
  url: URL,
  parentWindow?: BrowserWindow
): Promise<{
  allowed: boolean;
  dontAskAgain: boolean;
}> => {
  const { response, checkboxChecked } = await dialog.showMessageBox(
    parentWindow ?? (await getRootWindow()),
    {
      type: 'warning',
      buttons: [
        t('dialog.openingExternalProtocol.yes'),
        t('dialog.openingExternalProtocol.no'),
      ],
      defaultId: 1,
      title: t('dialog.openingExternalProtocol.title'),
      message: t('dialog.openingExternalProtocol.message', {
        protocol: url.protocol,
      }),
      detail: t('dialog.openingExternalProtocol.detail', {
        url: url.toString(),
      }),
      checkboxLabel: t('dialog.openingExternalProtocol.dontAskAgain'),
      checkboxChecked: false,
    }
  );

  return {
    allowed: response === 0,
    dontAskAgain: checkboxChecked,
  };
};

export const askForJitsiCaptureScreenPermission = async (
  url: URL,
  parentWindow?: BrowserWindow
): Promise<{
  allowed: boolean;
  dontAskAgain: boolean;
}> => {
  const { response, checkboxChecked } = await dialog.showMessageBox(
    parentWindow ?? (await getRootWindow()),
    {
      type: 'warning',
      buttons: [
        t('dialog.allowVideoCallCaptureScreen.yes'),
        t('dialog.allowVideoCallCaptureScreen.no'),
      ],
      defaultId: 1,
      title: t('dialog.allowVideoCallCaptureScreen.title'),
      message: t('dialog.allowVideoCallCaptureScreen.message'),
      detail: t('dialog.allowVideoCallCaptureScreen.detail', {
        url: url.toString(),
      }),
      checkboxLabel: t('dialog.allowVideoCallCaptureScreen.dontAskAgain'),
      checkboxChecked: false,
    }
  );

  return {
    allowed: response === 0,
    dontAskAgain: checkboxChecked,
  };
};

export const askForClearScreenCapturePermission = async (
  parentWindow?: BrowserWindow
): Promise<boolean> => {
  parentWindow?.show();

  const { response } = await dialog.showMessageBox(
    parentWindow ?? (await getRootWindow()),
    {
      type: 'question',
      buttons: [
        t('dialog.clearPermittedScreenCaptureServers.yes'),
        t('dialog.clearPermittedScreenCaptureServers.cancel'),
      ],
      defaultId: 1,
      title: t('dialog.clearPermittedScreenCaptureServers.title'),
      message: t('dialog.clearPermittedScreenCaptureServers.message'),
    }
  );

  return response === 0;
};

export const askForMediaPermissionSettings = async (
  permissionType: 'microphone' | 'camera' | 'both',
  parentWindow?: BrowserWindow
): Promise<boolean> => {
  parentWindow?.show();

  const { response } = await dialog.showMessageBox(
    parentWindow ?? (await getRootWindow()),
    {
      type: 'warning',
      buttons: [
        t('dialog.mediaPermission.openSettings'),
        t('dialog.mediaPermission.cancel'),
      ],
      defaultId: 0,
      title: t('dialog.mediaPermission.title'),
      message: t('dialog.mediaPermission.message', {
        permissionType: t(`dialog.mediaPermission.${permissionType}`),
      }),
      detail: t('dialog.mediaPermission.detail'),
    }
  );

  return response === 0;
};
