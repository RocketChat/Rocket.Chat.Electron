import path from 'path';

import { app, BrowserWindow, ipcMain, screen } from 'electron';

import { NOTIFICATIONS_NOTIFICATION_CLICKED } from '../notifications/actions';
import { ExtendedNotificationOptions } from '../notifications/common';
import { dispatchSingle } from '../store';
import { ActionIPCMeta } from '../store/actions';

type ScreenEdge = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type CustomNotification = {
  id: string;
  options: ExtendedNotificationOptions;
  avatar: string;
  title: string;
  body: string;
  edge: ScreenEdge;
  size: { width: number; height: number };
  timeout?: number;
  ipcMeta?: ActionIPCMeta;
};

function setPositionByEdge(
  edge: ScreenEdge,
  size: { width: number; height: number }
) {
  const {
    bounds: { width: primaryDisplayWidth, height: primaryDisplayHeight },
  } = screen.getPrimaryDisplay();

  switch (edge) {
    case 'top-left':
      return { x: 0, y: 0 };
    case 'top-right':
      return { x: primaryDisplayWidth - size.width, y: 0 };
    case 'bottom-left':
      return { x: 0, y: primaryDisplayHeight - size.height };
    case 'bottom-right':
      return {
        x: primaryDisplayWidth - size.width,
        y: primaryDisplayHeight - size.height,
      };
  }
}

export function createNotificationWindow(notification: CustomNotification) {
  const { x, y } = setPositionByEdge(notification.edge, notification.size);
  const { width, height } = notification.size;
  const win = new BrowserWindow({
    title: 'TITLE',
    frame: false,
    center: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    maximizable: false,
    minimizable: false,
    width,
    height,
    x,
    y,
    titleBarStyle: 'customButtonsOnHover',

    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      contextIsolation: false,
      webviewTag: true,
    },
  });
  win.setWindowButtonVisibility(false);
  win.loadFile(path.join(app.getAppPath(), 'app/notification.html'));

  ipcMain.once('desktopNotificationReady', (_event, _arg) => {
    console.log('desktopNotificationReady');
    win.webContents.send('notification', notification);
  });

  ipcMain.on('desktopNotificationClick', (_event, notification) => {
    const { id, title, ipcMeta } = notification;
    console.log('desktopNotificationClick', id);
    dispatchSingle({
      type: NOTIFICATIONS_NOTIFICATION_CLICKED,
      payload: { id, title },
      ipcMeta,
    });
    win.destroy();
  });

  setTimeout(() => {
    if (!win.isDestroyed()) {
      win.hide();
      win.destroy();
    }
  }, notification.timeout || 5000);
}
