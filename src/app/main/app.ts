import { app } from 'electron';
import rimraf from 'rimraf';

import { dispatch, listen } from '../../store';
import { readSetting } from '../../store/readSetting';
import { SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED } from '../../ui/actions';
import { getRootWindow } from '../../ui/main/rootWindow';
import { APP_PATH_SET, APP_VERSION_SET } from '../actions';

export const relaunchApp = (...args: string[]): void => {
  const command = process.argv.slice(1, app.isPackaged ? 1 : 2);
  app.relaunch({ args: [...command, ...args] });
  app.exit();
};

export const performElectronStartup = (): void => {
  app.setAsDefaultProtocolClient('rocketchat');
  app.setAppUserModelId('chat.rocket');

  app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch(
    'disable-features',
    'HardwareMediaKeyHandling,MediaSessionService'
  );

  const args = process.argv.slice(app.isPackaged ? 1 : 2);

  if (args.includes('--reset-app-data')) {
    rimraf.sync(app.getPath('userData'));
    relaunchApp();
    return;
  }

  const canStart = process.mas || app.requestSingleInstanceLock();

  if (!canStart) {
    app.exit();
    return;
  }

  const isHardwareAccelerationEnabled = readSetting(
    'isHardwareAccelerationEnabled'
  );

  if (
    args.includes('--disable-gpu') ||
    isHardwareAccelerationEnabled === false
  ) {
    console.log('Disabling Hardware acceleration');
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('--disable-2d-canvas-image-chromium');
    app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
    app.commandLine.appendSwitch('--disable-gpu');
  }
};

export const setupApp = (): void => {
  app.addListener('activate', async () => {
    const browserWindow = await getRootWindow();
    if (!browserWindow.isVisible()) {
      browserWindow.showInactive();
    }
    browserWindow.focus();
  });

  app.addListener('window-all-closed', () => {
    app.quit();
  });

  listen(SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED, (_action) => {
    relaunchApp();
  });

  dispatch({ type: APP_PATH_SET, payload: app.getAppPath() });
  dispatch({ type: APP_VERSION_SET, payload: app.getVersion() });
};
