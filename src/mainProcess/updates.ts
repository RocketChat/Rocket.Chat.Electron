import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import * as updateActions from '../common/actions/updateActions';
import * as updateCheckActions from '../common/actions/updateCheckActions';
import { dispatch, select } from '../common/store';

export const checkForUpdates = async (): Promise<void> => {
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    dispatch(updateCheckActions.failed(error));
  }
};

export const downloadUpdate = async (): Promise<void> => {
  try {
    autoUpdater.downloadUpdate();
  } catch (error) {
    dispatch(updateActions.failed(error));
  }
};

export const installUpdate = async (): Promise<void> => {
  try {
    app.removeAllListeners('window-all-closed');
    autoUpdater.quitAndInstall(true, true);
  } catch (error) {
    dispatch(updateActions.failed(error));
  }
};

export const attachUpdatesEvents = (): void => {
  autoUpdater.autoDownload = false;

  autoUpdater.addListener('checking-for-update', () => {
    dispatch(updateCheckActions.started());
  });

  autoUpdater.addListener('update-available', ({ version }) => {
    const skippedUpdateVersion = select(
      (state) => state.updates.settings.skippedVersion
    );
    if (skippedUpdateVersion === version) {
      dispatch(updateCheckActions.upToDate());
      return;
    }
    dispatch(updateCheckActions.newVersionAvailable(version));
  });

  autoUpdater.addListener('update-not-available', () => {
    dispatch(updateCheckActions.upToDate());
  });

  autoUpdater.addListener('update-downloaded', async () => {
    dispatch(updateActions.downloaded());
  });

  autoUpdater.addListener('error', (error) => {
    dispatch(updateCheckActions.failed(error));
  });
};
