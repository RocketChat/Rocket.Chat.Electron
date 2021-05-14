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
} from '../common/actions/updatesActions';
import { listen, dispatch, select } from '../common/store';
import {
  askUpdateInstall,
  AskUpdateInstallResponse,
  warnAboutInstallUpdateLater,
  warnAboutUpdateDownload,
  warnAboutUpdateSkipped,
} from './dialogs';

const checkForUpdates = async (): Promise<void> => {
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
};

export const setupUpdates = (): void => {
  const { isUpdatingAllowed, isUpdatingEnabled, doCheckForUpdatesOnStartup } =
    select(
      ({
        isUpdatingAllowed,
        isUpdatingEnabled,
        doCheckForUpdatesOnStartup,
      }) => ({
        isUpdatingAllowed,
        isUpdatingEnabled,
        doCheckForUpdatesOnStartup,
      })
    );

  if (!isUpdatingAllowed || !isUpdatingEnabled) {
    return;
  }

  autoUpdater.autoDownload = false;

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
    checkForUpdates();
  }

  listen(UPDATES_CHECK_FOR_UPDATES_REQUESTED, () => {
    checkForUpdates();
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
