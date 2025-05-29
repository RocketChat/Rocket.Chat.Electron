import fs from 'fs';
import path from 'path';

import type {
  BrowserWindow,
  ContextMenuParams,
  Event,
  Input,
  MediaAccessPermissionRequest,
  MenuItemConstructorOptions,
  OpenExternalPermissionRequest,
  Session,
  UploadFile,
  UploadRawData,
  WebContents,
  WebPreferences,
} from 'electron';
import {
  app,
  clipboard,
  dialog,
  Menu,
  systemPreferences,
  webContents,
} from 'electron';
import i18next from 'i18next';

import { setupPreloadReload } from '../../../app/main/dev';
import { handleWillDownloadEvent } from '../../../downloads/main';
import { handle } from '../../../ipc/main';
import { CERTIFICATES_CLEARED } from '../../../navigation/actions';
import { isProtocolAllowed } from '../../../navigation/main';
import type { Server } from '../../../servers/common';
import { dispatch, listen, select } from '../../../store';
import { openExternal } from '../../../utils/browserLauncher';
import {
  LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
  SIDE_BAR_CONTEXT_MENU_TRIGGERED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  WEBVIEW_READY,
  WEBVIEW_DID_FAIL_LOAD,
  WEBVIEW_DID_NAVIGATE,
  WEBVIEW_DID_START_LOADING,
  WEBVIEW_ATTACHED,
  WEBVIEW_SERVER_RELOADED,
  CLEAR_CACHE_TRIGGERED,
  WEBVIEW_PAGE_TITLE_CHANGED,
  SIDE_BAR_SERVER_RELOAD,
  SIDE_BAR_SERVER_COPY_URL,
  SIDE_BAR_SERVER_OPEN_DEV_TOOLS,
  SIDE_BAR_SERVER_FORCE_RELOAD,
  SIDE_BAR_SERVER_REMOVE,
} from '../../actions';
import { getRootWindow } from '../rootWindow';
import { createPopupMenuForServerView } from './popupMenu';

const t = i18next.t.bind(i18next);

const webContentsByServerUrl = new Map<Server['url'], WebContents>();

export const getWebContentsByServerUrl = (
  url: string
): WebContents | undefined => webContentsByServerUrl.get(url);

const initializeServerWebContentsAfterReady = (
  _serverUrl: string,
  guestWebContents: WebContents,
  rootWindow: BrowserWindow
): void => {
  const handleContextMenu = async (
    event: Event,
    params: ContextMenuParams
  ): Promise<void> => {
    event.preventDefault();
    const menu = createPopupMenuForServerView(guestWebContents, params);
    menu.popup({ window: rootWindow });
  };
  guestWebContents.addListener('context-menu', handleContextMenu);

  guestWebContents.on('page-title-updated', (_event, pageTitle) => {
    dispatch({
      type: WEBVIEW_PAGE_TITLE_CHANGED,
      payload: { url: _serverUrl, pageTitle },
    });
  });
};

export const serverReloadView = async (
  serverUrl: Server['url']
): Promise<void> => {
  const url = new URL(serverUrl).href;
  const guestWebContents = getWebContentsByServerUrl(url);
  await guestWebContents?.loadURL(url);
  if (url) {
    dispatch({
      type: WEBVIEW_SERVER_RELOADED,
      payload: { url },
    });
  }
};

const initializeServerWebContentsAfterAttach = (
  serverUrl: string,
  guestWebContents: WebContents,
  rootWindow: BrowserWindow
): void => {
  webContentsByServerUrl.set(serverUrl, guestWebContents);

  const webviewSession = guestWebContents.session;

  guestWebContents.addListener('destroyed', () => {
    guestWebContents.removeAllListeners();
    webviewSession.removeAllListeners();
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
    rootWindow.webContents.send(WEBVIEW_DID_START_LOADING, serverUrl);
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

  const handleBeforeInputEvent = (
    _event: Event,
    { type, key }: Input
  ): void => {
    if (type !== 'keyUp' && type !== 'keyDown') {
      return;
    }

    const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    if (key !== shortcutKey && key !== 'Escape') {
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
    webPreferences.preload = path.join(app.getAppPath(), 'app/preload.js');
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInWorker = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.webSecurity = true;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = false;
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

    webContents.setWindowOpenHandler(({ url, frameName, disposition }) => {
      if (
        disposition === 'foreground-tab' ||
        disposition === 'background-tab'
      ) {
        isProtocolAllowed(url).then((allowed) => {
          if (!allowed) {
            return { action: 'deny' };
          }

          openExternal(url);
          return { action: 'deny' };
        });
        return { action: 'deny' };
      }

      const isVideoCall = frameName === 'Video Call';

      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          ...(isVideoCall
            ? {
                webPreferences: {
                  preload: path.join(app.getAppPath(), 'app/preload.js'),
                  sandbox: false,
                },
              }
            : {}),
          show: false,
        },
      };
    });

    webContents.addListener(
      'did-create-window',
      (window, { url, frameName, disposition, referrer, postBody }) => {
        window.once('ready-to-show', () => {
          window.show();
        });

        isProtocolAllowed(url).then((allowed) => {
          if (!allowed) {
            window.destroy();
            return;
          }

          const isGoogleSignIn =
            frameName === 'Login' &&
            disposition === 'new-window' &&
            new URL(url).hostname.match(/(\.)?google\.com$/);

          window.loadURL(url, {
            userAgent: isGoogleSignIn
              ? app.userAgentFallback
                  .replace(`Electron/${process.versions.electron} `, '')
                  .replace(`${app.name}/${app.getVersion()} `, '')
              : app.userAgentFallback,
            httpReferrer: referrer,
            ...(postBody && {
              extraHeaders: `Content-Type: ${postBody.contentType}; boundary=${postBody.boundary}`,
              postData: postBody.data as unknown as
                | UploadRawData[]
                | UploadFile[],
            }),
          });
        });
      }
    );
  };

  const handlePermissionRequest: Parameters<
    Session['setPermissionRequestHandler']
  >[0] = async (_webContents, permission, callback, details) => {
    console.log('Permission request', permission, details);
    switch (permission) {
      case 'media': {
        const { mediaTypes = [] } = details as MediaAccessPermissionRequest;

        if (process.platform === 'darwin') {
          const allowed =
            (!mediaTypes.includes('audio') ||
              (await systemPreferences.askForMediaAccess('microphone'))) &&
            (!mediaTypes.includes('video') ||
              (await systemPreferences.askForMediaAccess('camera')));
          callback(allowed);
          return;
        }

        callback(true);
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
        if (!(details as OpenExternalPermissionRequest).externalURL) {
          callback(false);
          return;
        }

        const allowed = await isProtocolAllowed(
          (details as OpenExternalPermissionRequest).externalURL as string
        );
        callback(allowed);
        return;
      }

      default:
        callback(false);
    }
  };

  listen(WEBVIEW_READY, (action) => {
    const guestWebContents = webContents.fromId(
      action.payload.webContentsId
    ) as WebContents;
    initializeServerWebContentsAfterReady(
      action.payload.url,
      guestWebContents,
      rootWindow
    );

    guestWebContents.session.setPermissionRequestHandler(
      handlePermissionRequest
    );
    guestWebContents.session.on(
      'will-download',
      (event, item, _webContents) => {
        const fileName = item.getFilename();
        const extension = path.extname(fileName)?.slice(1).toLowerCase();
        const savePath = dialog.showSaveDialogSync(rootWindow, {
          defaultPath: item.getFilename(),
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
        if (savePath !== undefined) {
          item.setSavePath(savePath);
          handleWillDownloadEvent(event, item, _webContents);
          return;
        }
        event.preventDefault();
      }
    );

    // prevents the webview from navigating because of twitter preview links
    guestWebContents.on('will-navigate', (e, redirectUrl) => {
      const preventNavigateHosts = ['t.co', 'twitter.com'];

      if (preventNavigateHosts.includes(new URL(redirectUrl).hostname)) {
        e.preventDefault();
        isProtocolAllowed(redirectUrl).then((allowed) => {
          if (!allowed) {
            return;
          }

          openExternal(redirectUrl);
        });
      }
    });
  });

  listen(WEBVIEW_ATTACHED, (action) => {
    const guestWebContents = webContents.fromId(
      action.payload.webContentsId
    ) as WebContents;
    initializeServerWebContentsAfterAttach(
      action.payload.url,
      guestWebContents,
      rootWindow
    );
  });

  listen(LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, (action) => {
    const guestWebContents = getWebContentsByServerUrl(action.payload.url);
    guestWebContents?.loadURL(action.payload.url);
  });

  listen(SIDE_BAR_SERVER_RELOAD, (action) => {
    serverReloadView(action.payload);
  });

  listen(SIDE_BAR_SERVER_COPY_URL, async (action) => {
    const guestWebContents = getWebContentsByServerUrl(action.payload);
    const currentUrl = await guestWebContents?.getURL();
    clipboard.writeText(currentUrl || '');
  });

  listen(SIDE_BAR_SERVER_OPEN_DEV_TOOLS, (action) => {
    const guestWebContents = getWebContentsByServerUrl(action.payload);
    guestWebContents?.openDevTools();
  });

  listen(SIDE_BAR_SERVER_FORCE_RELOAD, (action) => {
    const guestWebContents = getWebContentsByServerUrl(action.payload);
    if (!guestWebContents) {
      return;
    }
    dispatch({
      type: CLEAR_CACHE_TRIGGERED,
      payload: guestWebContents.id,
    });
  });

  listen(SIDE_BAR_SERVER_REMOVE, (action) => {
    dispatch({
      type: SIDE_BAR_REMOVE_SERVER_CLICKED,
      payload: action.payload,
    });
  });

  listen(SIDE_BAR_CONTEXT_MENU_TRIGGERED, (action) => {
    const { payload: serverUrl } = action;

    const menuTemplate: MenuItemConstructorOptions[] = [
      {
        label: t('sidebar.item.reload'),
        click: () => {
          const guestWebContents = getWebContentsByServerUrl(serverUrl);
          guestWebContents?.loadURL(serverUrl);
          if (serverUrl) {
            dispatch({
              type: WEBVIEW_SERVER_RELOADED,
              payload: { url: serverUrl },
            });
          }
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
      {
        label: t('sidebar.item.copyCurrentUrl'),
        click: async () => {
          const guestWebContents = getWebContentsByServerUrl(serverUrl);
          const currentUrl = await guestWebContents?.getURL();
          clipboard.writeText(currentUrl || '');
        },
      },
      {
        label: t('sidebar.item.reloadClearingCache'),
        click: async () => {
          const guestWebContents = getWebContentsByServerUrl(serverUrl);
          if (!guestWebContents) {
            return;
          }
          dispatch({
            type: CLEAR_CACHE_TRIGGERED,
            payload: guestWebContents.id,
          });
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
        path.join(app.getAppPath(), 'app/injected.js'),
        'utf8'
      );
    }

    webContents.executeJavaScript(injectableCode, true);

    if (process.env.NODE_ENV === 'development') {
      injectableCode = undefined;
    }
  });

  handle('server-view/open-url-on-browser', async (_webContents, url) => {
    const allowed = await isProtocolAllowed(url);
    if (!allowed) {
      return;
    }

    openExternal(url);
  });
};
