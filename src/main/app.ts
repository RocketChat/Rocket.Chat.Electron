import { app } from 'electron';
import rimraf from 'rimraf';

import {
  APP_ERROR_THROWN,
  APP_PATH_SET,
  APP_VERSION_SET,
  AppErrorThrownAction,
} from '../actions';
import { listen, dispatch } from '../store';
import { getRootWindow } from './ui/rootWindow';

export const relaunchApp = (...args: string[]): void => {
  const command = process.argv.slice(1, app.isPackaged ? 1 : 2);
  app.relaunch({ args: [...command, ...args] });
  app.exit();
};

export const performElectronStartup = (): void => {
  app.setAsDefaultProtocolClient('rocketchat');
  app.setAppUserModelId('chat.rocket');

  app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

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

  if (args.includes('--disable-gpu')) {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('--disable-2d-canvas-image-chromium');
    app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
    app.commandLine.appendSwitch('--disable-gpu');
  }
};

export const setupApp = (): void => {
  app.addListener('activate', () => {
    const rootWindow = getRootWindow();
    rootWindow.showInactive();
    rootWindow.focus();
  });

  app.addListener('before-quit', () => {
    const rootWindow = getRootWindow();

    if (rootWindow.isDestroyed()) {
      return;
    }

    rootWindow.destroy();
  });

  app.addListener('second-instance', () => {
    const rootWindow = getRootWindow();

    rootWindow.showInactive();
    rootWindow.focus();
  });

  app.addListener('window-all-closed', () => {
    app.quit();
  });

  listen(APP_ERROR_THROWN, (action: AppErrorThrownAction) => {
    console.error(action.payload);
  });

  dispatch({ type: APP_PATH_SET, payload: app.getAppPath() });
  dispatch({ type: APP_VERSION_SET, payload: app.getVersion() });
};
