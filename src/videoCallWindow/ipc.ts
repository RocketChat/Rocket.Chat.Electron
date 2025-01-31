import path from 'path';

import type { Event, WebContents } from 'electron';
import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  screen,
  systemPreferences,
  shell,
} from 'electron';

import { packageJsonInformation } from '../app/main/app';
import { handle } from '../ipc/main';
import { getRootWindow } from '../ui/main/rootWindow';

export const handleDesktopCapturerGetSources = () => {
  handle('desktop-capturer-get-sources', async (_event, opts) =>
    desktopCapturer.getSources(opts)
  );
};

export const startVideoCallWindowHandler = (): void => {
  handle(
    'video-call-window/screen-recording-is-permission-granted',
    async () => {
      const permission = systemPreferences.getMediaAccessStatus('screen');
      return permission === 'granted';
    }
  );

  handle('video-call-window/open-window', async (_event, url) => {
    const validUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    if (validUrl.hostname.match(/(\.)?g\.co$/)) {
      shell.openExternal(validUrl.toString());
      return;
    }
    if (allowedProtocols.includes(validUrl.protocol)) {
      const mainWindow = await getRootWindow();
      const winBounds = await mainWindow.getNormalBounds();

      const centeredWindowPosition = {
        x: winBounds.x + winBounds.width / 2,
        y: winBounds.y + winBounds.height / 2,
      };

      const actualScreen = screen.getDisplayNearestPoint({
        x: centeredWindowPosition.x,
        y: centeredWindowPosition.y,
      });

      let { x, y } = actualScreen.bounds;
      let { width, height } = actualScreen.bounds;

      width = Math.round(actualScreen.workAreaSize.width * 0.8);
      height = Math.round(actualScreen.workAreaSize.height * 0.8);

      x = Math.round(
        (actualScreen.workArea.width - width) / 2 + actualScreen.workArea.x
      );
      y = Math.round(
        (actualScreen.workArea.height - height) / 2 + actualScreen.workArea.y
      );

      const videoCallWindow = new BrowserWindow({
        width,
        height,
        webPreferences: {
          nodeIntegration: true,
          nodeIntegrationInSubFrames: true,
          contextIsolation: false,
          webviewTag: true,
          // preload: `${__dirname}/video-call-window.js`,
        },

        show: false,
      });

      videoCallWindow.setBounds({
        width,
        height,
        x,
        y,
      });

      videoCallWindow.loadFile(
        path.join(app.getAppPath(), 'app/video-call-window.html')
      );

      videoCallWindow.once('ready-to-show', () => {
        videoCallWindow.setTitle(packageJsonInformation.productName);
        videoCallWindow.webContents.send('video-call-window/open-url', url);
        videoCallWindow.show();
      });

      // videoCallWindow.webContents.openDevTools();

      const handleDidAttachWebview = (
        _event: Event,
        webContents: WebContents
      ): void => {
        // console.log('[Rocket.Chat Desktop] did-attach-webview');
        // webContents.openDevTools();
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
