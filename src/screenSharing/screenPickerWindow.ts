import path from 'path';

import type { Event } from 'electron';
import { app, BrowserWindow } from 'electron';

import { packageJsonInformation } from '../app/main/app';

export type ScreenPickerWindowChannels = {
  response: string;
  permission: string;
  openUrl: string;
};

export const openScreenPickerWindow = (
  parent: BrowserWindow,
  channels: ScreenPickerWindowChannels
): BrowserWindow => {
  const parentBounds = parent.getBounds();
  const width = 780;
  const height = 680;
  const x = Math.round(parentBounds.x + (parentBounds.width - width) / 2);
  const y = Math.round(parentBounds.y + (parentBounds.height - height) / 2);

  const screenPickerWindow = new BrowserWindow({
    parent,
    width,
    height,
    x,
    y,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  screenPickerWindow.loadFile(
    path.join(app.getAppPath(), 'app/screen-picker-window.html'),
    {
      query: {
        response: channels.response,
        permission: channels.permission,
        openUrl: channels.openUrl,
      },
    }
  );

  screenPickerWindow.once('ready-to-show', () => {
    screenPickerWindow.setTitle(
      `Screen Sharing - ${packageJsonInformation.productName}`
    );
    screenPickerWindow.show();
  });

  screenPickerWindow.webContents.on('will-navigate', (event: Event) => {
    event.preventDefault();
  });

  screenPickerWindow.webContents.setWindowOpenHandler(() => ({
    action: 'deny',
  }));

  return screenPickerWindow;
};
