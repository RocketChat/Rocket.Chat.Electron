import fs from 'fs';
import path from 'path';

import {
  app,
  BrowserWindow,
  ContextMenuParams,
  DidFailLoadEvent,
  DidNavigateEvent,
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

import { setupPreloadReload } from '../../../app/main/dev';
import { handleWillDownloadEvent } from '../../../downloads/main';
import { handle } from '../../../ipc/main';
import { CERTIFICATES_CLEARED } from '../../../navigation/actions';
import { isProtocolAllowed } from '../../../navigation/main';
import { Server } from '../../../servers/common';
import { dispatch, listen, select } from '../../../store';
import {
  LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
  SIDE_BAR_CONTEXT_MENU_TRIGGERED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  WEBVIEW_ATTACHED,
  WEBVIEW_DID_FAIL_LOAD,
  WEBVIEW_DID_NAVIGATE,
  WEBVIEW_DID_START_LOADING,
} from '../../actions';
import { getRootWindow } from '../rootWindow';
import { createPopupMenuForServerView } from './popupMenu';

const t = i18next.t.bind(i18next);

const webContentsByServerUrl = new Map<Server['url'], WebContents>();

export const getWebContentsByServerUrl = (url: string): WebContents =>
  webContentsByServerUrl.get(url);

const initializeServerWebContents = (serverUrl: string, guestWebContents: WebContents, rootWindow: BrowserWindow): void => {
  webContentsByServerUrl.set(serverUrl, guestWebContents);

  const webviewSession = guestWebContents.session;

  guestWebContents.addListener('destroyed', () => {
    webContentsByServerUrl.delete(serverUrl);

    const canPurge = select(({ servers }) => !servers.some((server) => server.url === serverUrl));

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
    _event: DidFailLoadEvent,
    errorCode: number,
    _errorDescription: string,
    _validatedURL: string,
    isMainFrame: boolean,
    _frameProcessId: number,
    _frameRoutingId: number,
  ): void => {
    if (errorCode === -3) {
      console.warn('Ignoring likely spurious did-fail-load with errorCode -3, cf https://github.com/electron/electron/issues/14004');
      return;
    }

    dispatch({
      type: WEBVIEW_DID_FAIL_LOAD,
      payload: { url: serverUrl, isMainFrame },
    });
  };

  const handleDomReady = (): void => {
    guestWebContents.focus();
  };

  const handleDidNavigateInPage = (
    _event: DidNavigateEvent,
    pageUrl: string,
    _isMainFrame: boolean,
    _frameProcessId: number,
    _frameRoutingId: number,
  ): void => {
    dispatch({
      type: WEBVIEW_DID_NAVIGATE,
      payload: {
        url: serverUrl,
        pageUrl,
      },
    });
  };

  const handleContextMenu = async (event: Event, params: ContextMenuParams): Promise<void> => {
    event.preventDefault();
    const menu = createPopupMenuForServerView(guestWebContents, params);
    menu.popup({ window: rootWindow });
  };

  const handleBeforeInputEvent = (_event: Event, { type, key }: Input): void => {
    if (type !== 'keyUp' && type !== 'keyDown') {
      return;
    }

    const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    if (key !== shortcutKey) {
      return;
    }

    rootWindow.webContents.sendInputEvent({ type, keyCode: key, modifiers: [] });
  };

  guestWebContents.addListener('did-start-loading', handleDidStartLoading);
  guestWebContents.addListener('did-fail-load', handleDidFailLoad);
  guestWebContents.addListener('dom-ready', handleDomReady);
  guestWebContents.addListener('did-navigate-in-page', handleDidNavigateInPage);
  guestWebContents.addListener('context-menu', handleContextMenu);
  guestWebContents.addListener('before-input-event', handleBeforeInputEvent);
};

export const attachGuestWebContentsEvents = async (): Promise<void> => {
  const rootWindow = await getRootWindow();
  const handleWillAttachWebview = (_event: Event, webPreferences: WebPreferences, _params: Record<string, string>): void => {
    delete webPreferences.enableBlinkFeatures;
    webPreferences.preload = path.join(app.getAppPath(), 'app/preload.js');
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInWorker = true;
    webPreferences.nodeIntegrationInSubFrames = true;
    webPreferences.enableRemoteModule = false;
    webPreferences.webSecurity = true;
    webPreferences.contextIsolation = true;
    webPreferences.worldSafeExecuteJavaScript = true;
  };

  const handleDidAttachWebview = (_event: Event, webContents: WebContents): void => {
    // webContents.send('console-warn', '%c%s', 'color: red; font-size: 32px;', t('selfxss.title'));
    // webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.description'));
    // webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.moreInfo'));

    if (process.env.NODE_ENV === 'development') {
      setupPreloadReload(webContents);
    }

    webContents.addListener('new-window', (event, url, frameName, disposition, options, _additionalFeatures, referrer, postBody) => {
      event.preventDefault();

      if (disposition === 'foreground-tab' || disposition === 'background-tab') {
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

        const isGoogleSignIn = frameName === 'Login'
          && disposition === 'new-window'
          && new URL(url).hostname.match(/(\.)?google\.com$/);

        newWindow.loadURL(url, {
          userAgent: isGoogleSignIn
            ? app.userAgentFallback.replace(`Electron/${ process.versions.electron } `, '')
            : app.userAgentFallback,
          httpReferrer: referrer,
          ...postBody && {
            extraHeaders: `Content-Type: ${ postBody.contentType }; boundary=${ postBody.boundary }`,
            postData: postBody.data as unknown as (UploadRawData[] | UploadBlob[] | UploadFile[]),
          },
        });
      });

      event.newGuest = newWindow;
    });
  };

  const handlePermissionRequest: Parameters<Session['setPermissionRequestHandler']>[0] = async (
    _webContents,
    permission,
    callback,
    details,
  ) => {
    switch (permission) {
      case 'media': {
        if (process.platform !== 'darwin') {
          callback(true);
          return;
        }

        const { mediaTypes } = details;
        const allowed = (!mediaTypes.includes('audio') || await systemPreferences.askForMediaAccess('microphone'))
          && (!mediaTypes.includes('video') || await systemPreferences.askForMediaAccess('camera'));
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
        const allowed = await isProtocolAllowed(details.externalURL);
        callback(allowed);
        return;
      }

      default:
        callback(false);
    }
  };

  listen(WEBVIEW_ATTACHED, (action) => {
    const guestWebContents = webContents.fromId(action.payload.webContentsId);
    initializeServerWebContents(action.payload.url, guestWebContents, rootWindow);

    guestWebContents.session.setPermissionRequestHandler(handlePermissionRequest);
    guestWebContents.session.on('will-download', handleWillDownloadEvent);
  });

  listen(LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, (action) => {
    const guestWebContents = getWebContentsByServerUrl(action.payload.url);
    guestWebContents.loadURL(action.payload.url);
  });

  listen(SIDE_BAR_CONTEXT_MENU_TRIGGERED, (action) => {
    const { payload: serverUrl } = action;

    const menuTemplate: MenuItemConstructorOptions[] = [
      {
        label: t('sidebar.item.reload'),
        click: () => {
          const guestWebContents = getWebContentsByServerUrl(serverUrl);
          guestWebContents.loadURL(serverUrl);
        },
      },
      {
        label: t('sidebar.item.remove'),
        click: () => {
          dispatch({ type: SIDE_BAR_REMOVE_SERVER_CLICKED, payload: serverUrl });
        },
      },
      { type: 'separator' },
      {
        label: t('sidebar.item.openDevTools'),
        click: () => {
          const guestWebContents = getWebContentsByServerUrl(serverUrl);
          guestWebContents.openDevTools();
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

  rootWindow.webContents.addListener('will-attach-webview', handleWillAttachWebview);
  rootWindow.webContents.addListener('did-attach-webview', handleDidAttachWebview);

  handle('server-view/get-url', async (webContents) =>
    Array.from(webContentsByServerUrl.entries())
      .find(([, v]) => v === webContents)?.[0]);

  let injectableCode: string;
  handle('server-view/ready', async (webContents) => {
    if (!injectableCode) {
      injectableCode = await fs.promises.readFile(
        path.join(select(({ appPath }) => appPath), 'app/injected.js'),
        'utf8',
      );
    }

    webContents.executeJavaScript(injectableCode, true);
  });
};
