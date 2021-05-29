import fs from 'fs';

import {
  app,
  BrowserWindow,
  Event,
  session,
  shell,
  UploadBlob,
  UploadFile,
  UploadRawData,
  webContents,
  WebContents,
  WebPreferences,
} from 'electron';

import type { Server } from '../common/types/Server';
import { handle } from '../ipc/main';
import { setupPreloadReload } from './dev';
import { isProtocolAllowed } from './isProtocolAllowed';
import { joinAsarPath } from './joinAsarPath';
import { getRootWindow } from './rootWindow';

const webContentsByServerUrl = new Map<Server['url'], WebContents>();

export const getWebContentsByServerUrl = (
  url: string
): WebContents | undefined => webContentsByServerUrl.get(url);

export const getAllServerWebContents = (): WebContents[] =>
  Array.from(webContentsByServerUrl.values());

const initializeServerWebContents = (
  serverUrl: string,
  guestWebContents: WebContents
): void => {
  webContentsByServerUrl.set(serverUrl, guestWebContents);

  guestWebContents.addListener('destroyed', () => {
    webContentsByServerUrl.delete(serverUrl);
  });
};

export const attachGuestWebContentsEvents = async (): Promise<void> => {
  const rootWindow = await getRootWindow();
  const handleWillAttachWebview = (
    _event: Event,
    webPreferences: WebPreferences,
    _params: Record<string, string>
  ): void => {
    delete webPreferences.enableBlinkFeatures;
    webPreferences.preload = joinAsarPath('preload.js');
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInWorker = true;
    webPreferences.nodeIntegrationInSubFrames = true;
    webPreferences.enableRemoteModule = false;
    webPreferences.webSecurity = true;
    webPreferences.contextIsolation = true;
    webPreferences.worldSafeExecuteJavaScript = true;
  };

  const handleDidAttachWebview = (
    _event: Event,
    webContents: WebContents
  ): void => {
    // webContents.send('console-warn', '%c%s', 'color: red; font-size: 32px;', t('selfxss.title'));
    // webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.description'));
    // webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.moreInfo'));

    if (process.env.NODE_ENV === 'development') {
      setupPreloadReload(webContents);
    }

    webContents.addListener(
      'new-window',
      (
        event,
        url,
        frameName,
        disposition,
        options,
        _additionalFeatures,
        referrer,
        postBody
      ) => {
        event.preventDefault();

        if (
          disposition === 'foreground-tab' ||
          disposition === 'background-tab'
        ) {
          isProtocolAllowed(url).then((allowed) => {
            if (!allowed) {
              return;
            }

            shell.openExternal(url);
          });
          return;
        }

        const newWindow = new BrowserWindow({
          ...options,
          show: false,
        });

        newWindow.once('ready-to-show', () => {
          newWindow.show();
        });

        isProtocolAllowed(url).then((allowed) => {
          if (!allowed) {
            newWindow.destroy();
            return;
          }

          const isGoogleSignIn =
            frameName === 'Login' &&
            disposition === 'new-window' &&
            new URL(url).hostname.match(/(\.)?google\.com$/);

          newWindow.loadURL(url, {
            userAgent: isGoogleSignIn
              ? app.userAgentFallback.replace(
                  `Electron/${process.versions.electron} `,
                  ''
                )
              : app.userAgentFallback,
            httpReferrer: referrer,
            ...(postBody && {
              extraHeaders: `Content-Type: ${postBody.contentType}; boundary=${postBody.boundary}`,
              postData: postBody.data as unknown as
                | UploadRawData[]
                | UploadBlob[]
                | UploadFile[],
            }),
          });
        });

        event.newGuest = newWindow;
      }
    );
  };

  rootWindow.webContents.addListener(
    'will-attach-webview',
    handleWillAttachWebview
  );
  rootWindow.webContents.addListener(
    'did-attach-webview',
    handleDidAttachWebview
  );

  handle(
    'server-view/get-url',
    async (webContents) =>
      Array.from(webContentsByServerUrl.entries()).find(
        ([, v]) => v === webContents
      )?.[0]
  );

  let injectableCode: string | undefined;
  handle('server-view/ready', async (webContents) => {
    if (!injectableCode) {
      injectableCode = await fs.promises.readFile(
        joinAsarPath('injected.js'),
        'utf8'
      );
    }

    webContents.executeJavaScript(injectableCode, true);

    if (process.env.NODE_ENV === 'development') {
      injectableCode = undefined;
    }
  });
};

export const attachServerView = (
  url: Server['url'],
  webContentsId: number
): void => {
  const guestWebContents = webContents.fromId(webContentsId);
  initializeServerWebContents(url, guestWebContents);
};

export const purgeSessionStorageData = async (
  url: Server['url']
): Promise<void> => {
  await session.fromPartition(`persist:${url}`).clearStorageData();
};
