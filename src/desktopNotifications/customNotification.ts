import path from 'path';

import { app, BrowserWindow, screen } from 'electron';

type ScreenEdge = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type CustomNotification = {
  body: string;
  edge: ScreenEdge;
  size: { width: number; height: number };
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
      // preload: join(__dirname, 'bridge.js'),
    },
  });
  win.setWindowButtonVisibility(false);
  win.loadFile(path.join(app.getAppPath(), 'app/notification.html'));
}
