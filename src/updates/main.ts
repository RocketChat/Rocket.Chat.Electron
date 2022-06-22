import fs from 'fs';
import path from 'path';

import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import { listen, dispatch, select } from '../store';
import { RootState } from '../store/rootReducer';
import {
  UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
  UPDATE_DIALOG_INSTALL_BUTTON_CLICKED,
} from '../ui/actions';
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
import {
  AppLevelUpdateConfiguration,
  UpdateConfiguration,
  UserLevelUpdateConfiguration,
} from './common';

const readJsonObject = async (
  filePath: string
): Promise<Record<string, unknown>> => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const json = JSON.parse(content);

    return json && typeof json === 'object' && !Array.isArray(json) ? json : {};
  } catch (error) {
    return {};
  }
};

const readAppJsonObject = async (
  basename: string
): Promise<Record<string, unknown>> => {
  const filePath = path.join(
    app.getAppPath(),
    app.getAppPath().endsWith('app.asar') ? '..' : '.',
    basename
  );
  return readJsonObject(filePath);
};

const readUserJsonObject = async (
  basename: string
): Promise<Record<string, unknown>> => {
  const filePath = path.join(app.getPath('userData'), basename);
  return readJsonObject(filePath);
};

const loadAppConfiguration = async (): Promise<AppLevelUpdateConfiguration> =>
  readAppJsonObject('update.json');

const loadUserConfiguration = async (): Promise<UserLevelUpdateConfiguration> =>
  readUserJsonObject('update.json');

export const mergeConfigurations = (
  defaultConfiguration: UpdateConfiguration,
  appConfiguration: AppLevelUpdateConfiguration,
  userConfiguration: UserLevelUpdateConfiguration
): UpdateConfiguration => {
  const configuration = {
    ...defaultConfiguration,
    ...(typeof appConfiguration.forced === 'boolean' && {
      isEachUpdatesSettingConfigurable: !appConfiguration.forced,
    }),
    ...(typeof appConfiguration.canUpdate === 'boolean' && {
      isUpdatingEnabled: appConfiguration.canUpdate,
    }),
    ...(typeof appConfiguration.autoUpdate === 'boolean' && {
      doCheckForUpdatesOnStartup: appConfiguration.autoUpdate,
    }),
    ...(typeof appConfiguration.skip === 'string' && {
      skippedUpdateVersion: appConfiguration.skip,
    }),
  };

  if (
    typeof userConfiguration.autoUpdate === 'boolean' &&
    (configuration.isEachUpdatesSettingConfigurable ||
      typeof appConfiguration.autoUpdate === 'undefined')
  ) {
    configuration.doCheckForUpdatesOnStartup = userConfiguration.autoUpdate;
  }

  if (
    typeof userConfiguration.skip === 'string' &&
    (configuration.isEachUpdatesSettingConfigurable ||
      typeof appConfiguration.skip === 'undefined')
  ) {
    configuration.skippedUpdateVersion = userConfiguration.skip;
  }

  return configuration;
};

const loadConfiguration = async (): Promise<UpdateConfiguration> => {
  const defaultConfiguration = select(
    ({
      isUpdatingEnabled,
      doCheckForUpdatesOnStartup,
      skippedUpdateVersion,
      isReportEnabled,
      isFlashFrameEnabled,
      isHardwareAccelerationEnabled,
      isInternalVideoChatWindowEnabled,
    }: RootState) => ({
      isUpdatingAllowed:
        (process.platform === 'linux' && !!process.env.APPIMAGE) ||
        (process.platform === 'win32' && !process.windowsStore) ||
        (process.platform === 'darwin' && !process.mas),
      isEachUpdatesSettingConfigurable: true,
      isUpdatingEnabled,
      doCheckForUpdatesOnStartup,
      skippedUpdateVersion,
      isReportEnabled,
      isFlashFrameEnabled,
      isHardwareAccelerationEnabled,
      isInternalVideoChatWindowEnabled,
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
  // This is necessary to make the updater work in development mode
  if (process.env.NODE_ENV === 'development') {
    Object.defineProperty(app, 'isPackaged', {
      get() {
        return true;
      },
    });
    autoUpdater.updateConfigPath = path.join(
      app.getAppPath(),
      'dev-app-update.yml'
    );
  }

  autoUpdater.autoDownload = false;

  const {
    isUpdatingAllowed,
    isEachUpdatesSettingConfigurable,
    isUpdatingEnabled,
    doCheckForUpdatesOnStartup,
    skippedUpdateVersion,
    isReportEnabled,
    isFlashFrameEnabled,
    isHardwareAccelerationEnabled,
    isInternalVideoChatWindowEnabled,
  } = await loadConfiguration();

  dispatch({
    type: UPDATES_READY,
    payload: {
      isUpdatingAllowed,
      isEachUpdatesSettingConfigurable,
      isUpdatingEnabled,
      doCheckForUpdatesOnStartup,
      skippedUpdateVersion,
      isReportEnabled,
      isFlashFrameEnabled,
      isHardwareAccelerationEnabled,
      isInternalVideoChatWindowEnabled,
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
      error instanceof Error &&
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
      error instanceof Error &&
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
      setTimeout(() => {
        autoUpdater.checkForUpdates();
      }, 100);
    } catch (error) {
      error instanceof Error &&
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
      error instanceof Error &&
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
