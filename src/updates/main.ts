import fs from 'fs';
import path from 'path';

import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import { listen, dispatch, select } from '../store';
import { RootState } from '../store/rootReducer';
import { UPDATE_DIALOG_SKIP_UPDATE_CLICKED, UPDATE_DIALOG_INSTALL_BUTTON_CLICKED } from '../ui/actions';
import {
  askUpdateInstall,
  AskUpdateInstallResponse,
  warnAboutInstallUpdateLater,
  warnAboutUpdateDownload,
  warnAboutUpdateSkipped,
} from '../ui/main/dialogs';
import {
  UPDATE_SKIPPED,
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
  UPDATES_CHECKING_FOR_UPDATE,
  UPDATES_ERROR_THROWN,
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
  UPDATES_READY,
} from './actions';
import { UpdateConfiguration } from './common';

const loadAppConfiguration = async (): Promise<Record<string, unknown>> => {
  try {
    const filePath = path.join(
      app.getAppPath(),
      app.getAppPath().endsWith('app.asar') ? '..' : '.',
      'update.json',
    );
    const content = await fs.promises.readFile(filePath, 'utf8');
    const json = JSON.parse(content);

    return json && typeof json === 'object' ? json : {};
  } catch (error) {
    return {};
  }
};

const loadUserConfiguration = async (): Promise<Record<string, unknown>> => {
  try {
    const filePath = path.join(app.getPath('userData'), 'update.json');
    const content = await fs.promises.readFile(filePath, 'utf8');
    const json = JSON.parse(content);
    await fs.promises.unlink(filePath);

    return json && typeof json === 'object' ? json : {};
  } catch (error) {
    return {};
  }
};

const loadConfiguration = async (): Promise<UpdateConfiguration> => {
  const defaultConfiguration = select(({
    isEachUpdatesSettingConfigurable,
    isUpdatingEnabled,
    doCheckForUpdatesOnStartup,
    skippedUpdateVersion,
  }: RootState) => ({
    isUpdatingAllowed:
      (process.platform === 'linux' && !!process.env.APPIMAGE)
        || (process.platform === 'win32' && !process.windowsStore)
        || (process.platform === 'darwin' && !process.mas),
    isEachUpdatesSettingConfigurable,
    isUpdatingEnabled,
    doCheckForUpdatesOnStartup,
    skippedUpdateVersion,
  }));
  const appConfiguration = await loadAppConfiguration();

  const configuration = {
    ...defaultConfiguration,
    ...appConfiguration.forced ? { isEachUpdatesSettingConfigurable: false } : {},
    ...appConfiguration.canUpdate ? { doCheckForUpdatesOnStartup: true } : {},
    ...appConfiguration.autoUpdate ? { doCheckForUpdatesOnStartup: true } : {},
    ...appConfiguration.skip ? { skippedUpdateVersion: String(appConfiguration.skip) } : {},
  };

  if (configuration.isEachUpdatesSettingConfigurable) {
    const userConfiguration = await loadUserConfiguration();

    if (userConfiguration.autoUpdate) {
      configuration.doCheckForUpdatesOnStartup = true;
    }

    if (userConfiguration.skip) {
      configuration.skippedUpdateVersion = String(userConfiguration.skip);
    }
  }

  return configuration;
};

export const setupUpdates = async (): Promise<void> => {
  autoUpdater.autoDownload = false;

  const {
    isUpdatingAllowed,
    isEachUpdatesSettingConfigurable,
    isUpdatingEnabled,
    doCheckForUpdatesOnStartup,
    skippedUpdateVersion,
  } = await loadConfiguration();

  dispatch({
    type: UPDATES_READY,
    payload: {
      isUpdatingAllowed,
      isEachUpdatesSettingConfigurable,
      isUpdatingEnabled,
      doCheckForUpdatesOnStartup,
      skippedUpdateVersion,
    },
  });

  if (!isUpdatingAllowed || !isUpdatingEnabled) {
    return;
  }

  autoUpdater.addListener('checking-for-update', () => {
    dispatch({ type: UPDATES_CHECKING_FOR_UPDATE });
  });

  autoUpdater.addListener('update-available', ({ version }) => {
    const skippedUpdateVersion = select(({ skippedUpdateVersion }) => skippedUpdateVersion);
    if (skippedUpdateVersion === version) {
      dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
      return;
    }

    dispatch({
      type: UPDATES_NEW_VERSION_AVAILABLE,
      payload: version as string,
    });
  });

  autoUpdater.addListener('update-not-available', () => {
    dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
  });

  autoUpdater.addListener('update-downloaded', async () => {
    const response = await askUpdateInstall();

    if (response === AskUpdateInstallResponse.INSTALL_LATER) {
      await warnAboutInstallUpdateLater();
      return;
    }

    try {
      app.removeAllListeners('window-all-closed');
      autoUpdater.quitAndInstall(true, true);
    } catch (error) {
      dispatch({
        type: UPDATES_ERROR_THROWN,
        payload: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    }
  });

  autoUpdater.addListener('error', (error) => {
    dispatch({
      type: UPDATES_ERROR_THROWN,
      payload: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    });
  });

  if (doCheckForUpdatesOnStartup) {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      dispatch({
        type: UPDATES_ERROR_THROWN,
        payload: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    }
  }

  listen(UPDATES_CHECK_FOR_UPDATES_REQUESTED, async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      dispatch({
        type: UPDATES_ERROR_THROWN,
        payload: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    }
  });

  listen(UPDATE_DIALOG_SKIP_UPDATE_CLICKED, async (action) => {
    await warnAboutUpdateSkipped();
    dispatch({
      type: UPDATE_SKIPPED,
      payload: action.payload,
    });
  });

  listen(UPDATE_DIALOG_INSTALL_BUTTON_CLICKED, async () => {
    await warnAboutUpdateDownload();

    try {
      autoUpdater.downloadUpdate();
    } catch (error) {
      dispatch({
        type: UPDATES_ERROR_THROWN,
        payload: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    }
  });
};
