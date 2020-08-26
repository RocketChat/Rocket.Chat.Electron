import { app, BrowserWindow } from 'electron';
import { Store } from 'redux';
import { Effect, takeEvery } from 'redux-saga/effects';
import rimraf from 'rimraf';

import {
  APP_ERROR_THROWN, AppErrorThrown,
} from '../actions';

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

export const setupApp = (_reduxStore: Store, rootWindow: BrowserWindow): void => {
  app.addListener('activate', () => {
    rootWindow.showInactive();
    rootWindow.focus();
  });

  app.addListener('before-quit', () => {
    if (rootWindow.isDestroyed()) {
      return;
    }

    rootWindow.destroy();
  });

  app.addListener('second-instance', () => {
    rootWindow.showInactive();
    rootWindow.focus();
  });

  app.addListener('window-all-closed', () => {
    app.quit();
  });
};

export function *takeAppActions(): Generator<Effect, void> {
  yield takeEvery(APP_ERROR_THROWN, function *(action: AppErrorThrown) {
    const { payload: error } = action;
    console.error(error.stack);
  });
}
