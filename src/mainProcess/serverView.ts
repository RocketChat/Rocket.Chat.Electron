import fs from 'fs';
import { extname } from 'path';

import {
  app,
  BrowserWindow,
  ContextMenuParams,
  DownloadItem,
  Event,
  Input,
  Menu,
  MenuItemConstructorOptions,
  Session,
  shell,
  systemPreferences,
  UploadBlob,
  UploadFile,
  UploadRawData,
  webContents,
  WebContents,
  WebPreferences,
} from 'electron';
import i18next from 'i18next';

import * as downloadActions from '../common/actions/downloadActions';
import { CERTIFICATES_CLEARED } from '../common/actions/navigationActions';
import * as serverActions from '../common/actions/serverActions';
import {
  LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
  SIDE_BAR_CONTEXT_MENU_TRIGGERED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  WEBVIEW_DID_FAIL_LOAD,
  WEBVIEW_DID_NAVIGATE,
  WEBVIEW_DID_START_LOADING,
} from '../common/actions/uiActions';
import { dispatch, listen, select } from '../common/store';
import { DownloadStatus } from '../common/types/DownloadStatus';
import type { Server } from '../common/types/Server';
import { handle } from '../ipc/main';
import { setupPreloadReload } from './dev';
import { registerDownloadItem, unregisterDownloadItem } from './downloads';
import { isProtocolAllowed } from './isProtocolAllowed';
import { joinAsarPath } from './joinAsarPath';
import { createPopupMenuForServerView } from './popupMenu';
import { getRootWindow } from './rootWindow';

const t = i18next.t.bind(i18next);

const webContentsByServerUrl = new Map<Server['url'], WebContents>();

export const getWebContentsByServerUrl = (
  url: string
): WebContents | undefined => webContentsByServerUrl.get(url);

const initializeServerWebContents = (
  serverUrl: string,
  guestWebContents: WebContents,
  rootWindow: BrowserWindow
): void => {
  webContentsByServerUrl.set(serverUrl, guestWebContents);

  const webviewSession = guestWebContents.session;

  guestWebContents.addListener('destroyed', () => {
    webContentsByServerUrl.delete(serverUrl);

    const canPurge = select(
      ({ servers }) => !servers.some((server) => server.url === serverUrl)
    );

    if (canPurge) {
      webviewSession.clearStorageData();
      return;
    }

    webviewSession.flushStorageData();
  });

  const handleDidStartLoading = (): void => {
    dispatch({ type: WEBVIEW_DID_START_LOADING, payload: { url: serverUrl } });
  };

  const handleDidFailLoad = (
    _event: Event,
    errorCode: number,
    _errorDescription: string,
    _validatedURL: string,
    isMainFrame: boolean,
    _frameProcessId: number,
    _frameRoutingId: number
  ): void => {
    if (errorCode === -3) {
      console.warn(
        'Ignoring likely spurious did-fail-load with errorCode -3, cf https://github.com/electron/electron/issues/14004'
      );
      return;
    }

    dispatch({
      type: WEBVIEW_DID_FAIL_LOAD,
      payload: { url: serverUrl, isMainFrame },
    });
  };

  const handleDidNavigateInPage = (
    _event: Event,
    pageUrl: string,
    _isMainFrame: boolean,
    _frameProcessId: number,
    _frameRoutingId: number
  ): void => {
    dispatch({
      type: WEBVIEW_DID_NAVIGATE,
      payload: {
        url: serverUrl,
        pageUrl,
      },
    });
  };

  const handleContextMenu = async (
    event: Event,
    params: ContextMenuParams
  ): Promise<void> => {
    event.preventDefault();
    const menu = createPopupMenuForServerView(guestWebContents, params);
    menu.popup({ window: rootWindow });
  };

  const handleBeforeInputEvent = (
    _event: Event,
    { type, key }: Input
  ): void => {
    if (type !== 'keyUp' && type !== 'keyDown') {
      return;
    }

    const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    if (key !== shortcutKey) {
      return;
    }

    rootWindow.webContents.sendInputEvent({
      type,
      keyCode: key,
      modifiers: [],
    });
  };

  guestWebContents.addListener('did-start-loading', handleDidStartLoading);
  guestWebContents.addListener('did-fail-load', handleDidFailLoad);
  guestWebContents.addListener('did-navigate-in-page', handleDidNavigateInPage);
  guestWebContents.addListener('context-menu', handleContextMenu);
  guestWebContents.addListener('before-input-event', handleBeforeInputEvent);
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

  const handlePermissionRequest: Parameters<
    Session['setPermissionRequestHandler']
  >[0] = async (_webContents, permission, callback, details) => {
    switch (permission) {
      case 'media': {
        if (process.platform !== 'darwin') {
          callback(true);
          return;
        }

        const { mediaTypes = [] } = details;
        const allowed =
          (!mediaTypes.includes('audio') ||
            (await systemPreferences.askForMediaAccess('microphone'))) &&
          (!mediaTypes.includes('video') ||
            (await systemPreferences.askForMediaAccess('camera')));
        callback(allowed);
        return;
      }

      case 'geolocation':
      case 'notifications':
      case 'midiSysex':
      case 'pointerLock':
      case 'fullscreen':
        callback(true);
        return;

      case 'openExternal': {
        if (!details.externalURL) {
          callback(false);
          return;
        }

        const allowed = await isProtocolAllowed(details.externalURL);
        callback(allowed);
        return;
      }

      default:
        callback(false);
    }
  };

  listen(serverActions.webviewAttached.match, (action) => {
    const guestWebContents = webContents.fromId(action.payload.webContentsId);
    initializeServerWebContents(
      action.payload.url,
      guestWebContents,
      rootWindow
    );

    guestWebContents.session.setPermissionRequestHandler(
      handlePermissionRequest
    );

    const handleWillDownloadEvent = async (
      _event: Event,
      item: DownloadItem,
      serverWebContents: WebContents
    ): Promise<void> => {
      const itemId = Date.now();

      registerDownloadItem(itemId, item);

      const fileName = item.getFilename();

      const extension = extname(fileName)?.slice(1).toLowerCase();

      if (extension) {
        item.setSaveDialogOptions({
          filters: [
            {
              name: `*.${extension}`,
              extensions: [extension],
            },
            {
              name: '*.*',
              extensions: ['*'],
            },
          ],
        });
      }

      const server = select(({ servers }) =>
        servers.find((server) => server.webContentsId === serverWebContents.id)
      );

      if (!server) {
        // TODO: check if the download always comes from the main frame webContents
        throw new Error('could not match the server');
      }

      dispatch(
        downloadActions.created({
          itemId,
          state: item.isPaused() ? 'paused' : item.getState(),
          status: item.isPaused() ? DownloadStatus.PAUSED : DownloadStatus.ALL,
          fileName: item.getFilename(),
          receivedBytes: item.getReceivedBytes(),
          totalBytes: item.getTotalBytes(),
          startTime: item.getStartTime() * 1000,
          endTime: undefined,
          url: item.getURL(),
          serverUrl: server?.url,
          serverTitle: server?.title,
          mimeType: item.getMimeType(),
          savePath: item.getSavePath(),
        })
      );

      item.on('updated', () => {
        dispatch(
          downloadActions.updated(itemId, {
            state: item.isPaused() ? 'paused' : item.getState(),
            status: item.isPaused()
              ? DownloadStatus.PAUSED
              : DownloadStatus.ALL,
            fileName: item.getFilename(),
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            startTime: item.getStartTime() * 1000,
            endTime: Date.now(),
            url: item.getURL(),
            mimeType: item.getMimeType(),
            savePath: item.getSavePath(),
          })
        );
      });

      item.on('done', () => {
        dispatch(
          downloadActions.updated(itemId, {
            state: item.isPaused() ? 'paused' : item.getState(),
            status:
              item.getState() === 'cancelled'
                ? DownloadStatus.CANCELLED
                : DownloadStatus.ALL,
            fileName: item.getFilename(),
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            startTime: item.getStartTime() * 1000,
            endTime: Date.now(),
            url: item.getURL(),
            mimeType: item.getMimeType(),
            savePath: item.getSavePath(),
          })
        );

        unregisterDownloadItem(itemId);
      });
    };

    guestWebContents.session.on('will-download', handleWillDownloadEvent);
  });

  listen(LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, (action) => {
    const guestWebContents = getWebContentsByServerUrl(action.payload.url);
    guestWebContents?.loadURL(action.payload.url);
  });

  listen(SIDE_BAR_CONTEXT_MENU_TRIGGERED, (action) => {
    const { payload: serverUrl } = action;

    const menuTemplate: MenuItemConstructorOptions[] = [
      {
        label: t('sidebar.item.reload'),
        click: () => {
          const guestWebContents = getWebContentsByServerUrl(serverUrl);
          guestWebContents?.loadURL(serverUrl);
        },
      },
      {
        label: t('sidebar.item.remove'),
        click: () => {
          dispatch({
            type: SIDE_BAR_REMOVE_SERVER_CLICKED,
            payload: serverUrl,
          });
        },
      },
      { type: 'separator' },
      {
        label: t('sidebar.item.openDevTools'),
        click: () => {
          const guestWebContents = getWebContentsByServerUrl(serverUrl);
          guestWebContents?.openDevTools();
        },
      },
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    menu.popup({
      window: rootWindow,
    });
  });

  listen(CERTIFICATES_CLEARED, () => {
    for (const serverViewWebContents of webContentsByServerUrl.values()) {
      serverViewWebContents.reloadIgnoringCache();
    }
  });

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
