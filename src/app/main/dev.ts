import fs from 'fs';
import http from 'http';
import path from 'path';

import { app, WebContents } from 'electron';

import { App } from './app';

export const setUserDataDirectory = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  app.setPath(
    'userData',
    path.join(app.getPath('appData'), `${app.name} (development)`)
  );
};

export const setupRootWindowReload = async (
  webContents: WebContents
): Promise<void> => {
  const chokidar = await import('chokidar');
  chokidar
    .watch(path.join(app.getAppPath(), 'app/rootWindow.js'), {
      awaitWriteFinish: true,
    })
    .on('change', () => {
      if (webContents.isDestroyed()) {
        return;
      }

      console.log('Reloading root window...');
      webContents.reload();
    });
};

export const setupPreloadReload = async (
  webContents: WebContents
): Promise<void> => {
  const chokidar = await import('chokidar');
  chokidar
    .watch(
      [
        path.join(app.getAppPath(), 'app/preload.js'),
        path.join(app.getAppPath(), 'app/injected.js'),
      ],
      {
        awaitWriteFinish: true,
      }
    )
    .on('change', () => {
      if (webContents.isDestroyed()) {
        return;
      }

      console.log('Reloading webview...');
      webContents.reload();
    });
};

export const installDevTools = async (): Promise<void> => {
  const {
    default: installExtension,
    REACT_DEVELOPER_TOOLS,
    REDUX_DEVTOOLS,
  } = await import('electron-devtools-installer');
  await installExtension(REACT_DEVELOPER_TOOLS);
  await installExtension(REDUX_DEVTOOLS);
};

export class DevelopmentMode {
  public static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || App.args.includes('--dev');
  }

  public static setupServer(): void {
    http
      .createServer((req, res) => {
        const file = path
          .join(app.getAppPath(), 'app', req.url ?? 'index.html')
          .replace('app/app', 'app');
        fs.readFile(file, (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end(JSON.stringify(err));
            return;
          }
          res.writeHead(200);
          res.end(data);
        });
      })
      .listen(process.env.ELECTRON_WEBCLIENT_PORT);
    console.log(
      `Development server listening on port ${process.env.ELECTRON_WEBCLIENT_PORT}`
    );
  }

  public static installDevTools(): Promise<void> {
    return installDevTools();
  }
}
