import fs from 'fs';
import path from 'path';

import type {
  BrowserWindow,
  ContextMenuParams,
  Event,
  Input,
  MediaAccessPermissionRequest,
  OpenExternalPermissionRequest,
  UploadFile,
  UploadRawData,
  WebContents,
  WebPreferences,
} from 'electron';
import { app, clipboard, webContents } from 'electron';

import { setupPreloadReload } from '../../../app/main/dev';
import { handle } from '../../../ipc/main';
import { CERTIFICATES_CLEARED } from '../../../navigation/actions';
import { isProtocolAllowed } from '../../../navigation/main';
import { setupServerViewDisplayMedia } from '../../../screenSharing/serverViewScreenSharing';
import { SERVER_DOCUMENT_VIEWER_OPEN_URL } from '../../../servers/actions';
import type { Server } from '../../../servers/common';
import { dispatch, listen, select } from '../../../store';
import { openExternal } from '../../../utils/browserLauncher';
import {
  LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
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
  WEBVIEW_FORCE_RELOAD_WITH_CACHE_CLEAR,
} from '../../actions';
import { handleMediaPermissionRequest } from '../mediaPermissions';
import { getRootWindow } from '../rootWindow';
import { isMarkdownViewerDownloadUrl } from './isMarkdownViewerDownloadUrl';
import { createPopupMenuForServerView } from './popupMenu';

const webContentsByServerUrl = new Map<Server['url'], WebContents>();

const VIDEO_CALL_PRELOAD_PATH = 'app/preload/preload.js';

/**
 * Determines if a webview is a video call webview based on partition and frame name.
 */
const isVideoCallWebview = (
  partition?: string,
  frameName?: string
): boolean => {
  if (partition === 'persist:video-call-session') {
    return true;
  }

  if (frameName === 'Video Call') {
    return true;
  }

  return false;
};

/**
 * Resolves and validates preload file paths, falling back to safe defaults.
 * Returns the preload path or null if no valid preload is available.
 */
const resolvePreloadPath = (isVideoCall: boolean): string | null => {
  const appPath = app.getAppPath();
  const defaultPreload = path.join(appPath, 'app/preload.js');
  const videoCallPreload = path.join(appPath, VIDEO_CALL_PRELOAD_PATH);

  const targetPreload = isVideoCall ? videoCallPreload : defaultPreload;
  const fallbackPreload = isVideoCall ? defaultPreload : null;

  if (fs.existsSync(targetPreload)) {
    return targetPreload;
  }

  if (fallbackPreload && fs.existsSync(fallbackPreload)) {
    console.warn(
      `Preload file not found: ${targetPreload}, falling back to: ${fallbackPreload}`
    );
    return fallbackPreload;
  }

  console.warn(
    `Preload file not found: ${targetPreload}${
      fallbackPreload ? ` or fallback: ${fallbackPreload}` : ''
    }. Preload will be disabled.`
  );
  return null;
};

/**
 * Determines if a permission request's origin matches a configured server.
 * Used to gate permissions (geolocation, notifications, fullscreen) that
 * Electron would otherwise grant unconditionally, regardless of which
 * origin — including a compromised or unexpected one — asked for them.
 */
export const isRequestFromKnownServer = (
  requestingUrl: string | undefined,
  servers: ReadonlyArray<Pick<Server, 'url'>>
): boolean => {
  if (!requestingUrl) {
    return false;
  }
  try {
    const requestingOrigin = new URL(requestingUrl).origin;
    return servers.some((server) => {
      if (!server.url) {
        return false;
      }
      try {
        return new URL(server.url).origin === requestingOrigin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
};

export const getWebContentsByServerUrl = (
  url: string
): WebContents | undefined => webContentsByServerUrl.get(url);

export const getServerUrlByWebContentsId = (
  webContentsId: number
): string | undefined => {
  const targetWebContents = webContents.fromId(webContentsId);
  if (!targetWebContents) {
    return undefined;
  }
  return Array.from(webContentsByServerUrl.entries()).find(
    ([, wc]) => wc === targetWebContents
  )?.[0];
};

export const setupServerViewPermissionHandler = (
  guestWebContents: WebContents,
  rootWindow: BrowserWindow
): void => {
  guestWebContents.session.setPermissionRequestHandler(
    async (_webContents, permission, callback, details) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Permission request', permission, details);
      }
      switch (permission) {
        case 'media': {
          const { mediaTypes = [] } = details as MediaAccessPermissionRequest;
          try {
            await handleMediaPermissionRequest(
              mediaTypes as ReadonlyArray<'audio' | 'video'>,
              rootWindow,
              'recordMessage',
              callback
            );
          } catch (error) {
            console.error(
              'Error handling media permission request in server view:',
              error
            );
            callback(false);
          }
          return;
        }

        case 'midiSysex':
        case 'pointerLock':
          callback(true);
          return;

        case 'geolocation':
        case 'notifications':
        case 'fullscreen': {
          const { requestingUrl } = details;
          const servers = select(({ servers }) => servers);
          callback(isRequestFromKnownServer(requestingUrl, servers));
          return;
        }

        case 'openExternal': {
          const { externalURL } = details as OpenExternalPermissionRequest;
          if (!externalURL) {
            callback(false);
            return;
          }

          try {
            const allowed = await isProtocolAllowed(externalURL);
            callback(allowed);
          } catch (error) {
            console.error(
              'Failed to validate external protocol request:',
              error
            );
            callback(false);
          }
          return;
        }

        default:
          callback(false);
      }
    }
  );
};

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
  if (!guestWebContents) {
    return;
  }
  try {
    await guestWebContents.loadURL(url);
  } catch (error) {
    console.error('Failed to load URL for guestWebContents:', error);
  }
  dispatch({
    type: WEBVIEW_SERVER_RELOADED,
    payload: { url },
  });
};

const initializeServerWebContentsAfterAttach = (
  serverUrl: string,
  guestWebContents: WebContents,
  rootWindow: BrowserWindow
): void => {
  webContentsByServerUrl.set(serverUrl, guestWebContents);

  const webviewSession = guestWebContents.session;

  // Intercept markdown file downloads and open in document viewer
  webviewSession.on('will-download', (_event, item) => {
    const downloadUrl = item.getURL();
    if (!isMarkdownViewerDownloadUrl(downloadUrl, item.getFilename())) return;
    item.cancel();
    dispatch({
      type: SERVER_DOCUMENT_VIEWER_OPEN_URL,
      payload: {
        server: serverUrl,
        documentUrl: downloadUrl,
        documentFormat: 'markdown',
      },
    });
  });

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

  let isGuestInHtmlFullscreen = false;

  guestWebContents.addListener('enter-html-full-screen', () => {
    isGuestInHtmlFullscreen = true;
  });

  guestWebContents.addListener('leave-html-full-screen', () => {
    isGuestInHtmlFullscreen = false;
  });

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

    // On macOS, forwarding ESC to the root window while the guest is in
    // HTML5 fullscreen (e.g. a video player) causes the native window to
    // also exit fullscreen. This does not occur on Windows/Linux.
    if (key === 'Escape' && isGuestInHtmlFullscreen) {
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
    const isVideoCall = isVideoCallWebview(
      _params.partition,
      _params.frameName
    );
    const preloadPath = resolvePreloadPath(isVideoCall);
    if (preloadPath) {
      webPreferences.preload = preloadPath;
    } else {
      delete webPreferences.preload;
    }
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
      // Keep same-origin navigations/downloads inside the app to preserve auth/session
      const currentServerUrl = getServerUrlByWebContentsId(webContents.id);
      const currentHost = currentServerUrl ? new URL(currentServerUrl).host : '';
      const targetHost = (() => {
        try {
          return new URL(url).host;
        } catch {
          return '';
        }
      })();

      const sameOrigin = currentHost !== '' && currentHost === targetHost;

      // For tab dispositions, open externally only if not same-origin
      if (
        disposition === 'foreground-tab' ||
        disposition === 'background-tab'
      ) {
        if (sameOrigin) {
          const isVideoCall = isVideoCallWebview(undefined, frameName);
          const preloadPath = resolvePreloadPath(isVideoCall);
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              ...(isVideoCall
                ? {
                    webPreferences: {
                      ...(preloadPath ? { preload: preloadPath } : {}),
                      sandbox: false,
                    },
                  }
                : {}),
              // Crucial: keep the same session to retain authentication
              webPreferences: {
                ...(isVideoCall && preloadPath ? { preload: preloadPath } : {}),
                session: webContents.session,
                sandbox: false,
              },
              show: false,
            },
          };
        }

        isProtocolAllowed(url).then((allowed) => {
          if (!allowed) {
            return { action: 'deny' };
          }
          openExternal(url);
          return { action: 'deny' };
        });
        return { action: 'deny' };
      }

      // Let Electron handle explicit save-to-disk with our download hooks
      if (disposition === 'save-to-disk') {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            webPreferences: {
              session: webContents.session,
              sandbox: false,
            },
            show: false,
          },
        };
      }

      const isVideoCall = isVideoCallWebview(undefined, frameName);
      const preloadPath = resolvePreloadPath(isVideoCall);

      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          ...(isVideoCall
            ? {
                webPreferences: {
                  ...(preloadPath ? { preload: preloadPath } : {}),
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

  listen(WEBVIEW_READY, (action) => {
    const guestWebContents = webContents.fromId(
      action.payload.webContentsId
    ) as WebContents;
    initializeServerWebContentsAfterReady(
      action.payload.url,
      guestWebContents,
      rootWindow
    );

    setupServerViewPermissionHandler(guestWebContents, rootWindow);

    setupServerViewDisplayMedia(guestWebContents);

    // Download handling is now managed by electron-dl in main.ts
    // and integrated with our downloads system via setupDownloads()

    // prevents the webview from navigating because of twitter preview links
    guestWebContents.on('will-navigate', (e, redirectUrl) => {
      const { protocol, hostname } = new URL(redirectUrl);

      if (protocol !== 'http:' && protocol !== 'https:') {
        e.preventDefault();
        return;
      }

      const preventNavigateHosts = ['t.co', 'twitter.com'];

      if (preventNavigateHosts.includes(hostname)) {
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
    if (!guestWebContents) {
      return;
    }
    guestWebContents.loadURL(action.payload.url).catch((error) => {
      console.error('Failed to load URL for guestWebContents:', error);
    });
  });

  listen(SIDE_BAR_SERVER_RELOAD, (action) => {
    serverReloadView(action.payload);
  });

  listen(SIDE_BAR_SERVER_COPY_URL, async (action) => {
    const guestWebContents = getWebContentsByServerUrl(action.payload);
    const currentUrl = guestWebContents?.getURL();
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

  listen(WEBVIEW_FORCE_RELOAD_WITH_CACHE_CLEAR, async (action) => {
    const serverUrl = action.payload;
    const guestWebContents = getWebContentsByServerUrl(serverUrl);
    if (!guestWebContents) {
      return;
    }

    // Clear cache keeping login data using the same method as Force Reload
    await guestWebContents.session.clearCache();
    await guestWebContents.session.clearStorageData({
      storages: [
        'cookies',
        'indexdb',
        'filesystem',
        'shadercache',
        'websql',
        'serviceworkers',
        'cachestorage',
      ],
    });

    // Reload ignoring cache
    guestWebContents.reloadIgnoringCache();

    dispatch({
      type: WEBVIEW_SERVER_RELOADED,
      payload: { url: serverUrl },
    });
  });
};
