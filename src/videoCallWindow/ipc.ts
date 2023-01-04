import path from 'path';

import { app, BrowserWindow } from 'electron';

import { handle } from '../ipc/main';

export const startVideoCallWindowHandler = (): void => {
  console.log('[Rocket.Chat Desktop] startVideoCallWindowHandler');
  handle('video-call-window/open-window', async (_event, url) => {
    console.log('[Rocket.Chat Desktop] open-internal-video-chat-window', url);
    const validUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    if (allowedProtocols.includes(validUrl.protocol)) {
      const videoCallWindow = new BrowserWindow({
        width: 1800,
        height: 1200,
        webPreferences: {
          nodeIntegration: true,
          nodeIntegrationInSubFrames: true,
          contextIsolation: false,
          webviewTag: true,
          // preload: `${__dirname}/video-call-window.js`,
        },

        // show: false,
      });
      // videoCallWindow.loadURL(validUrl.href);
      videoCallWindow.loadFile(
        path.join(app.getAppPath(), 'app/video-call-window.html')
      );
      videoCallWindow.once('ready-to-show', () => {
        console.log('[Rocket.Chat Desktop] ready-to-show', url);
        videoCallWindow.webContents.send('video-call-window/open-url', url);
        // videoCallWindow.show();
      });
      // videoCallWindow.webContents.executeJavaScript('videoCallURL = $url;');
      videoCallWindow.webContents.openDevTools();
    }
  });
};
