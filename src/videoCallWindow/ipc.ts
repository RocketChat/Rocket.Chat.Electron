import path from 'path';

import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  WebContents,
} from 'electron';

import { handle } from '../ipc/main';

export const startVideoCallWindowHandler = (): void => {
  handle('video-call-window/open-window', async (_event, url) => {
    console.log('[Rocket.Chat Desktop] open-internal-video-chat-window', url);
    const validUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    if (allowedProtocols.includes(validUrl.protocol)) {
      const videoCallWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
          nodeIntegration: true,
          nodeIntegrationInSubFrames: true,
          contextIsolation: false,
          webviewTag: true,
          // preload: `${__dirname}/video-call-window.js`,
        },

        show: false,
      });
      videoCallWindow.loadFile(
        path.join(app.getAppPath(), 'app/video-call-window.html')
      );
      videoCallWindow.once('ready-to-show', () => {
        console.log('[Rocket.Chat Desktop] ready-to-show', url);
        videoCallWindow.webContents.send('video-call-window/open-url', url);
        videoCallWindow.show();
      });

      // videoCallWindow.webContents.openDevTools();

      const handleDidAttachWebview = (
        _event: Event,
        webContents: WebContents
      ): void => {
        // console.log('[Rocket.Chat Desktop] did-attach-webview');
        webContents.openDevTools();
        webContents.session.setDisplayMediaRequestHandler((_request, cb) => {
          videoCallWindow.webContents.send(
            'video-call-window/open-screen-picker'
          );
          ipcMain.once(
            'video-call-window/screen-sharing-source-responded',
            (_event, id) => {
              if (!id) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                cb(null);
                return;
              }

              desktopCapturer
                .getSources({ types: ['window', 'screen'] })
                .then((sources) => {
                  cb({ video: sources.find((s) => s.id === id) });
                });
            }
          );
        });
      };

      videoCallWindow.webContents.addListener(
        'did-attach-webview',
        handleDidAttachWebview
      );
    }
  });
};
