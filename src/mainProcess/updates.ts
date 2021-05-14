import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import {
  UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
  UPDATE_DIALOG_INSTALL_BUTTON_CLICKED,
} from '../common/actions/uiActions';
import {
  UPDATE_SKIPPED,
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
  UPDATES_CHECKING_FOR_UPDATE,
  UPDATES_ERROR_THROWN,
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
  UPDATES_READY,
} from '../common/actions/updatesActions';
import type { RootState } from '../common/reducers';
import { listen, dispatch, select } from '../common/store';
import type { AppLevelUpdateConfiguration } from '../common/types/AppLevelUpdateConfiguration';
import type { UpdateConfiguration } from '../common/types/UpdateConfiguration';
import type { UserLevelUpdateConfiguration } from '../common/types/UserLevelUpdateConfiguration';
import {
  askUpdateInstall,
  AskUpdateInstallResponse,
  warnAboutInstallUpdateLater,
  warnAboutUpdateDownload,
  warnAboutUpdateSkipped,
} from './dialogs';
import { joinAppPath } from './joinAppPath';
import { joinUserPath } from './joinUserPath';
import { mergeConfigurations } from './mergeConfigurations';
import { readJsonObject } from './readJsonObject';

const loadAppConfiguration = async (): Promise<AppLevelUpdateConfiguration> =>
  readJsonObject(joinAppPath('update.json'));

const loadUserConfiguration = async (): Promise<UserLevelUpdateConfiguration> =>
  readJsonObject(joinUserPath('update.json'));

const loadConfiguration = async (): Promise<UpdateConfiguration> => {
  const defaultConfiguration = select(
    ({
      isUpdatingEnabled,
      doCheckForUpdatesOnStartup,
      skippedUpdateVersion,
    }: RootState) => ({
      isUpdatingAllowed:
        (process.platform === 'linux' && !!process.env.APPIMAGE) ||
        (process.platform === 'win32' && !process.windowsStore) ||
        (process.platform === 'darwin' && !process.mas),
      isEachUpdatesSettingConfigurable: true,
      isUpdatingEnabled,
      doCheckForUpdatesOnStartup,
      skippedUpdateVersion,
    })
  );
  const appConfiguration = await loadAppConfiguration();
  const userConfiguration = await loadUserConfiguration();

  return mergeConfigurations(
    defaultConfiguration,
    appConfiguration,
    userConfiguration
  );
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
    const skippedUpdateVersion = select(
      ({ skippedUpdateVersion }) => skippedUpdateVersion
    );
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
