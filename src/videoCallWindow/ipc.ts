import path from 'path';
import process from 'process';

import type {
  Event,
  WebContents,
  MediaAccessPermissionRequest,
} from 'electron';
import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  screen,
  systemPreferences,
  webContents,
} from 'electron';

import { packageJsonInformation } from '../app/main/app';
import { fallbackLng } from '../i18n/common';
import { handle } from '../ipc/main';
import { isProtocolAllowed } from '../navigation/main';
import { select, dispatchLocal } from '../store';
import { VIDEO_CALL_WINDOW_STATE_CHANGED } from '../ui/actions';
import { debounce } from '../ui/main/debounce';
import { handleMediaPermissionRequest } from '../ui/main/mediaPermissions';
import { isInsideSomeScreen, getRootWindow } from '../ui/main/rootWindow';
import { openExternal } from '../utils/browserLauncher';

const DESKTOP_CAPTURER_STALE_THRESHOLD = 3000;
const SOURCE_VALIDATION_CACHE_TTL = 30000;
const DESTRUCTION_CHECK_INTERVAL = 50;
const DEVTOOLS_TIMEOUT = 2000;
const WEBVIEW_CHECK_INTERVAL = 100;

let videoCallWindow: BrowserWindow | null = null;
let isVideoCallWindowDestroying = false;
let pendingVideoCallUrl: string | null = null;

// Helper function to log URL changes
const setPendingVideoCallUrl = (url: string, reason: string) => {
  const previous = pendingVideoCallUrl;
  pendingVideoCallUrl = url;

  console.log(`Video call window: pendingVideoCallUrl updated - ${reason}`, {
    previous,
    new: url,
    timestamp: new Date().toISOString(),
  });
};

let desktopCapturerCache: {
  sources: Electron.DesktopCapturerSource[];
  timestamp: number;
} | null = null;

let desktopCapturerPromise: Promise<Electron.DesktopCapturerSource[]> | null =
  null;

const sourceValidationCache: Set<string> = new Set();
let sourceValidationCacheTimestamp = 0;

let videoCallWindowCreationCount = 0;
let videoCallWindowDestructionCount = 0;

const logVideoCallWindowStats = () => {
  console.log('Video call window stats:', {
    created: videoCallWindowCreationCount,
    destroyed: videoCallWindowDestructionCount,
    currentInstance: videoCallWindow ? 'active' : 'none',
    cacheStatus: desktopCapturerCache ? 'cached' : 'empty',
    promiseStatus: desktopCapturerPromise ? 'pending' : 'none',
  });
};

const refreshDesktopCapturerCache = (
  options: Electron.SourcesOptions
): void => {
  if (desktopCapturerPromise) return;

  desktopCapturerPromise = (async () => {
    try {
      const sources = await desktopCapturer.getSources(options);

      const validSources = sources.filter((source) => {
        if (!source.name || source.name.trim() === '') {
          return false;
        }

        const now = Date.now();
        const cacheExpired =
          now - sourceValidationCacheTimestamp > SOURCE_VALIDATION_CACHE_TTL;

        if (!cacheExpired && sourceValidationCache.has(source.id)) {
          return true;
        }

        if (source.thumbnail.isEmpty()) {
          return false;
        }

        if (cacheExpired) {
          sourceValidationCache.clear();
          sourceValidationCacheTimestamp = now;
        }
        sourceValidationCache.add(source.id);

        return true;
      });

      desktopCapturerCache = {
        sources: validSources,
        timestamp: Date.now(),
      };

      return validSources;
    } catch (error) {
      console.error('Background cache refresh failed:', error);
      return desktopCapturerCache?.sources || [];
    } finally {
      desktopCapturerPromise = null;
    }
  })();
};

export const handleDesktopCapturerGetSources = () => {
  handle('desktop-capturer-get-sources', async (_webContents, opts) => {
    try {
      const options = Array.isArray(opts) ? opts[0] : opts;

      if (desktopCapturerCache) {
        const isStale =
          Date.now() - desktopCapturerCache.timestamp >
          DESKTOP_CAPTURER_STALE_THRESHOLD;
        if (isStale && !desktopCapturerPromise) {
          refreshDesktopCapturerCache(options);
        }
        return desktopCapturerCache.sources;
      }

      if (desktopCapturerPromise) {
        return await desktopCapturerPromise;
      }

      refreshDesktopCapturerCache(options);
      if (desktopCapturerPromise) {
        return await desktopCapturerPromise;
      }
      return [];
    } catch (error) {
      console.error('Error in desktop capturer handler:', error);
      return desktopCapturerCache?.sources || [];
    }
  });
};

const fetchVideoCallWindowState = async (browserWindow: BrowserWindow) => {
  return {
    focused: browserWindow.isFocused(),
    visible: browserWindow.isVisible(),
    maximized: false,
    minimized: false,
    fullscreen: false,
    normal: true,
    bounds: browserWindow.getNormalBounds(),
  };
};

const cleanupVideoCallWindow = () => {
  if (
    videoCallWindow &&
    !videoCallWindow.isDestroyed() &&
    !isVideoCallWindowDestroying
  ) {
    console.log('Cleaning up video call window resources');
    isVideoCallWindowDestroying = true;

    try {
      // Set permission handler with additional safety
      if (
        videoCallWindow.webContents &&
        !videoCallWindow.webContents.isDestroyed()
      ) {
        videoCallWindow.webContents.session.setPermissionRequestHandler(
          () => false
        );

        videoCallWindow.webContents.executeJavaScript('void 0').catch(() => {
          // Ignore errors during cleanup
        });
      }

      try {
        const allWebContents = webContents.getAllWebContents();
        const webviewContents = allWebContents.find(
          (wc) => wc.hostWebContents === videoCallWindow?.webContents
        );

        if (webviewContents && !webviewContents.isDestroyed()) {
          console.log(
            'Stopping webview JavaScript execution before window cleanup'
          );
          webviewContents.session.setPermissionRequestHandler(() => false);
          webviewContents.loadURL('about:blank').catch(() => {});
        }
      } catch (error) {
        console.log(
          'Could not clean webview contents, continuing with window cleanup'
        );
      }

      videoCallWindow.removeAllListeners();

      // Use setImmediate to ensure this happens after current event loop
      // This prevents timing issues during app initialization
      setImmediate(() => {
        if (videoCallWindow && !videoCallWindow.isDestroyed()) {
          videoCallWindow.close();
        }
      });
    } catch (error) {
      console.error('Error during video call window cleanup:', error);
      if (videoCallWindow && !videoCallWindow.isDestroyed()) {
        try {
          videoCallWindow.removeAllListeners();
          setImmediate(() => {
            if (videoCallWindow && !videoCallWindow.isDestroyed()) {
              videoCallWindow.close();
            }
          });
        } catch (fallbackError) {
          console.error('Error in fallback cleanup:', fallbackError);
        }
      }
    }
  }

  // Use setTimeout to ensure this cleanup happens after any window events are processed
  setTimeout(() => {
    videoCallWindow = null;
    isVideoCallWindowDestroying = false;
    videoCallWindowDestructionCount++;

    console.log('Video call window cleanup completed');
    logVideoCallWindowStats();
  }, 10);
};

const setupWebviewHandlers = (webContents: WebContents) => {
  const handleDidAttachWebview = (
    _event: Event,
    webviewWebContents: WebContents
  ): void => {
    webviewWebContents.session.setDisplayMediaRequestHandler((_request, cb) => {
      if (videoCallWindow && !videoCallWindow.isDestroyed()) {
        videoCallWindow.webContents.send(
          'video-call-window/open-screen-picker'
        );

        ipcMain.once(
          'video-call-window/screen-sharing-source-responded',
          async (_event, sourceId) => {
            if (!sourceId) {
              cb({ video: false } as any);
              return;
            }

            try {
              const sources = await desktopCapturer.getSources({
                types: ['window', 'screen'],
              });

              const selectedSource = sources.find((s) => s.id === sourceId);

              if (!selectedSource) {
                console.warn(
                  'Selected screen sharing source no longer available:',
                  sourceId
                );
                cb({ video: false } as any);
                return;
              }

              cb({ video: selectedSource });
            } catch (error) {
              console.error('Error validating screen sharing source:', error);
              cb({ video: false } as any);
            }
          }
        );
      }
    });
  };

  webContents.removeAllListeners('did-attach-webview');

  webContents.on('did-attach-webview', handleDidAttachWebview);
};

export const startVideoCallWindowHandler = (): void => {
  handle(
    'video-call-window/screen-recording-is-permission-granted',
    async () => {
      if (process.platform === 'darwin') {
        const permission = systemPreferences.getMediaAccessStatus('screen');
        return permission === 'granted';
      }
      return true;
    }
  );

  handle('video-call-window/open-screen-picker', async (_webContents) => {
    // This is handled by the renderer process (screenSharePicker.tsx)
    // The handler exists to satisfy the IPC call from preload script
  });

  handle('video-call-window/open-window', async (_webContents, url) => {
    console.log('Video call window: Open-window handler called with URL:', url);

    if (isVideoCallWindowDestroying) {
      console.log('Waiting for video call window destruction to complete...');
      await new Promise<void>((resolve) => {
        const checkDestructionComplete = () => {
          if (!isVideoCallWindowDestroying) {
            resolve();
          } else {
            setTimeout(checkDestructionComplete, DESTRUCTION_CHECK_INTERVAL);
          }
        };
        checkDestructionComplete();
      });
    }

    if (videoCallWindow && !videoCallWindow.isDestroyed()) {
      console.log('Closing existing video call window to create fresh one');
      videoCallWindow.close();
      videoCallWindow = null;

      if (isVideoCallWindowDestroying) {
        await new Promise<void>((resolve) => {
          const checkClosed = () => {
            if (!isVideoCallWindowDestroying) {
              resolve();
            } else {
              setTimeout(checkClosed, DESTRUCTION_CHECK_INTERVAL);
            }
          };
          checkClosed();
        });
      }
    }

    const validUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    console.log(
      'Video call window: URL validation - hostname:',
      validUrl.hostname,
      'protocol:',
      validUrl.protocol
    );

    if (validUrl.hostname.match(/(\.)?g\.co$/)) {
      console.log(
        'Video call window: Google URL detected, opening externally instead of internal window'
      );
      openExternal(validUrl.toString());
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

      const state = select((state) => ({
        videoCallWindowState: state.videoCallWindowState,
        isVideoCallWindowPersistenceEnabled:
          state.isVideoCallWindowPersistenceEnabled,
        isAutoOpenEnabled: state.isVideoCallDevtoolsAutoOpenEnabled,
      }));

      let { x, y, width, height } = state.videoCallWindowState.bounds;

      if (
        !state.isVideoCallWindowPersistenceEnabled ||
        !x ||
        !y ||
        width === 0 ||
        height === 0 ||
        !isInsideSomeScreen({ x, y, width, height })
      ) {
        width = Math.round(actualScreen.workAreaSize.width * 0.8);
        height = Math.round(actualScreen.workAreaSize.height * 0.8);
        x = Math.round(
          (actualScreen.workArea.width - width) / 2 + actualScreen.workArea.x
        );
        y = Math.round(
          (actualScreen.workArea.height - height) / 2 + actualScreen.workArea.y
        );
      }

      console.log('Creating new video call window');
      videoCallWindowCreationCount++;

      logVideoCallWindowStats();

      const additionalArgs: string[] = [];

      if (process.platform === 'win32') {
        const sessionName = process.env.SESSIONNAME;
        const isRdpSession =
          typeof sessionName === 'string' && sessionName !== 'Console';
        const { readSetting } = await import('../store/readSetting');
        const isScreenCaptureFallbackEnabled = readSetting(
          'isVideoCallScreenCaptureFallbackEnabled'
        );

        if (isScreenCaptureFallbackEnabled || isRdpSession) {
          additionalArgs.push(
            '--disable-features=WebRtcAllowWgcDesktopCapturer,WebRtcAllowWgcScreenCapturer'
          );
          console.log(
            'Video call window: Explicitly passing WGC disable flags to webview via additionalArguments',
            { isRdpSession, isScreenCaptureFallbackEnabled }
          );
        }
      }

      videoCallWindow = new BrowserWindow({
        width,
        height,
        x,
        y,
        webPreferences: {
          nodeIntegration: true,
          nodeIntegrationInSubFrames: true,
          contextIsolation: false,
          webviewTag: true,
          experimentalFeatures: false,
          offscreen: false,
          disableHtmlFullscreenWindowResize: true,
          backgroundThrottling: true,
          v8CacheOptions: 'bypassHeatCheck',
          spellcheck: false,
          ...(additionalArgs.length > 0 && {
            additionalArguments: additionalArgs,
          }),
        },
        show: false,
        frame: true,
        transparent: false,
        skipTaskbar: false,
      });

      videoCallWindow.webContents.on(
        'will-navigate',
        (event: Event, url: string) => {
          if (url.toLowerCase().startsWith('smb://')) {
            event.preventDefault();
          }
        }
      );
      videoCallWindow.webContents.setWindowOpenHandler(
        ({ url }: { url: string }) => {
          if (url.toLowerCase().startsWith('smb://')) {
            return { action: 'deny' };
          }
          return { action: 'allow' };
        }
      );

      if (state.isVideoCallWindowPersistenceEnabled) {
        const fetchAndDispatchWindowState = debounce(async () => {
          if (videoCallWindow && !videoCallWindow.isDestroyed()) {
            dispatchLocal({
              type: VIDEO_CALL_WINDOW_STATE_CHANGED,
              payload: await fetchVideoCallWindowState(videoCallWindow),
            });
          }
        }, 1000);

        videoCallWindow.addListener('show', fetchAndDispatchWindowState);
        videoCallWindow.addListener('hide', fetchAndDispatchWindowState);
        videoCallWindow.addListener('focus', fetchAndDispatchWindowState);
        videoCallWindow.addListener('blur', fetchAndDispatchWindowState);
        videoCallWindow.addListener('maximize', fetchAndDispatchWindowState);
        videoCallWindow.addListener('unmaximize', fetchAndDispatchWindowState);
        videoCallWindow.addListener('minimize', fetchAndDispatchWindowState);
        videoCallWindow.addListener('restore', fetchAndDispatchWindowState);
        videoCallWindow.addListener('resize', fetchAndDispatchWindowState);
        videoCallWindow.addListener('move', fetchAndDispatchWindowState);
      }

      videoCallWindow.on('closed', () => {
        console.log('Video call window closed - destroying completely');

        // Use setTimeout to ensure cleanup happens after any potential app lifecycle events
        // This prevents crashes during first launch when timing is critical
        setTimeout(() => {
          try {
            videoCallWindow = null;
            isVideoCallWindowDestroying = false;
            videoCallWindowDestructionCount++;

            logVideoCallWindowStats();
          } catch (error) {
            console.error(
              'Error during video call window closed event handling:',
              error
            );
          }
        }, 50); // Small delay to let app state stabilize
      });

      videoCallWindow.on('close', (_event) => {
        if (!isVideoCallWindowDestroying) {
          isVideoCallWindowDestroying = true;
          console.log(
            'Video call window close initiated - preventing JS execution'
          );

          try {
            if (videoCallWindow && !videoCallWindow.isDestroyed()) {
              videoCallWindow.webContents.session.setPermissionRequestHandler(
                () => false
              );
              videoCallWindow.webContents
                .executeJavaScript('void 0')
                .catch(() => {});
            }
          } catch (error) {
            console.log('Error during close preparation:', error);
          }
        }
      });

      videoCallWindow.webContents.on(
        'did-fail-load',
        (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
          console.error('Video call window failed to load:', {
            errorCode,
            errorDescription,
            validatedURL,
            isMainFrame,
          });

          if (isMainFrame) {
            console.error(
              'Main frame failed to load, this may indicate issues on low-power devices'
            );
          }
        }
      );

      videoCallWindow.webContents.on('dom-ready', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Video call window DOM ready');
        }

        videoCallWindow?.webContents
          .executeJavaScript(
            `
          if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
            console.log('Video call window: JavaScript execution test successful');
          }
          window.videoCallWindowJSWorking = true;
          setTimeout(() => {
            const rootElement = document.getElementById('root');
            const hasReactContent = rootElement && (
              rootElement.hasChildNodes() || 
              rootElement.innerHTML.trim() !== ''
            );
            
            if (!hasReactContent) {
              console.warn('Video call window: React may not have rendered - possible initialization issue');
            } else if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
              console.log('Video call window: React content detected successfully');
            }
          }, 5000);
        `
          )
          .catch((error) => {
            console.error(
              'Video call window: JavaScript execution test failed:',
              error
            );
          });
      });

      videoCallWindow.webContents.on(
        'console-message',
        (_event, level, message, line, sourceId) => {
          const logPrefix = 'Video call window console:';
          switch (level) {
            case 0:
              console.log(
                `${logPrefix} [INFO]`,
                message,
                `(${sourceId}:${line})`
              );
              break;
            case 1:
              console.warn(
                `${logPrefix} [WARN]`,
                message,
                `(${sourceId}:${line})`
              );
              break;
            case 2:
              console.error(
                `${logPrefix} [ERROR]`,
                message,
                `(${sourceId}:${line})`
              );
              break;
            default:
              console.log(
                `${logPrefix} [${level}]`,
                message,
                `(${sourceId}:${line})`
              );
          }
        }
      );

      const htmlPath = path.join(
        app.getAppPath(),
        'app/video-call-window.html'
      );
      console.log('Video call window: Loading HTML file from:', htmlPath);

      videoCallWindow
        .loadFile(htmlPath, {
          query: {
            url,
            autoOpenDevtools: String(state.isAutoOpenEnabled),
          },
        })
        .catch((error) => {
          console.error('Video call window: Failed to load HTML file:', error);
          console.error(
            'This may indicate build issues or file system problems on low-power devices'
          );
        });

      videoCallWindow.once('ready-to-show', () => {
        if (videoCallWindow && !videoCallWindow.isDestroyed()) {
          videoCallWindow.setTitle(packageJsonInformation.productName);

          console.log(
            'Video call window: Window ready, waiting for renderer to signal ready state'
          );
          console.log(
            'Video call window: Current pending URL:',
            pendingVideoCallUrl
          );
          videoCallWindow.show();
        }
      });

      const { webContents } = videoCallWindow;

      setupWebviewHandlers(webContents);

      // Set the pending URL after window is created to prevent race condition with cleanup
      setPendingVideoCallUrl(url, 'open-window-after-creation');
      console.log(
        'Video call window: Set pending URL after window creation:',
        url
      );

      webContents.setWindowOpenHandler(({ url }: { url: string }) => {
        console.log('Video call window - new window requested:', url);

        if (url.toLowerCase().startsWith('smb://')) {
          return { action: 'deny' };
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
          openExternal(url);
          return { action: 'deny' };
        }

        return { action: 'allow' };
      });

      webContents.on('will-navigate', (event: any, url: string) => {
        console.log('Video call window will-navigate:', url);

        // Check for close pages and handle them specially to prevent crashes
        if (url.includes('/close.html') || url.includes('/close2.html')) {
          console.log(
            'Video call window: Navigation to close page detected, will handle gracefully'
          );
          // Don't prevent navigation, but note it for safer handling
        }

        try {
          const parsedUrl = new URL(url);

          if (
            !['http:', 'https:', 'file:', 'data:', 'about:'].includes(
              parsedUrl.protocol
            )
          ) {
            console.log(
              'External protocol detected in video call window:',
              parsedUrl.protocol
            );
            event.preventDefault();

            isProtocolAllowed(url).then((allowed) => {
              if (allowed) {
                openExternal(url);
              }
            });
          }
        } catch (e) {
          console.warn('Failed to parse URL in video call window:', url, e);
        }
      });

      webContents.session.setPermissionRequestHandler(
        async (
          _webContents: any,
          permission: any,
          callback: any,
          details: any
        ) => {
          console.log(
            'Video call window permission request',
            permission,
            details
          );
          switch (permission) {
            case 'media': {
              const { mediaTypes = [] } =
                details as MediaAccessPermissionRequest;
              try {
                await handleMediaPermissionRequest(
                  mediaTypes as ReadonlyArray<'audio' | 'video'>,
                  videoCallWindow,
                  'initiateCall',
                  callback
                );
              } catch (error) {
                console.error(
                  'Error handling media permission request in video call window:',
                  error
                );
                callback(false);
              }
              return;
            }

            case 'geolocation':
            case 'notifications':
            case 'midiSysex':
            case 'pointerLock':
            case 'fullscreen':
            case 'screen-wake-lock':
            case 'system-wake-lock':
              callback(true);
              return;

            case 'openExternal': {
              callback(true);
              return;
            }

            default:
              callback(false);
          }
        }
      );
    }
  });

  handle('video-call-window/close-requested', async () => {
    console.log(
      'Video call window: Close requested via navigation to close page'
    );

    // Add safety check and delay to prevent crashes during first launch
    if (videoCallWindow && !videoCallWindow.isDestroyed()) {
      // Use setImmediate to ensure this happens after any pending navigation events
      setImmediate(() => {
        try {
          if (
            videoCallWindow &&
            !videoCallWindow.isDestroyed() &&
            !isVideoCallWindowDestroying
          ) {
            console.log(
              'Video call window: Proceeding with close after navigation delay'
            );
            videoCallWindow.close();
          } else {
            console.log(
              'Video call window: Already destroyed or being destroyed, skipping close'
            );
          }
        } catch (error) {
          console.error(
            'Error closing video call window after close page navigation:',
            error
          );
        }
      });
      return { success: true };
    }

    console.log('Video call window: Already destroyed, cannot close');
    return { success: false };
  });

  handle('video-call-window/open-webview-dev-tools', async () => {
    if (!videoCallWindow || videoCallWindow.isDestroyed()) {
      console.warn('Video call window not available for dev tools');
      return false;
    }

    try {
      const webviewWebContents = await new Promise<WebContents | null>(
        (resolve) => {
          const checkForWebview = () => {
            const allWebContents = webContents.getAllWebContents();

            const webviewContents = allWebContents.find((wc) => {
              return wc.hostWebContents === videoCallWindow?.webContents;
            });

            if (webviewContents) {
              resolve(webviewContents);
            } else {
              setTimeout(checkForWebview, WEBVIEW_CHECK_INTERVAL);
            }
          };

          checkForWebview();

          setTimeout(() => resolve(null), DEVTOOLS_TIMEOUT);
        }
      );

      if (webviewWebContents && !webviewWebContents.isDestroyed()) {
        console.log('Opening developer tools for video call webview');
        webviewWebContents.openDevTools();
        return true;
      }
      console.warn('Video call webview webContents not found or destroyed');
      return false;
    } catch (error) {
      console.error('Error opening webview developer tools:', error);
      return false;
    }
  });
};

export const openVideoCallWebviewDevTools = async (): Promise<boolean> => {
  if (!videoCallWindow || videoCallWindow.isDestroyed()) {
    console.warn('Video call window not available for dev tools');
    return false;
  }

  try {
    const webviewWebContents = await new Promise<WebContents | null>(
      (resolve) => {
        const checkForWebview = () => {
          const allWebContents = webContents.getAllWebContents();

          const webviewContents = allWebContents.find((wc: WebContents) => {
            return wc.hostWebContents === videoCallWindow?.webContents;
          });

          if (webviewContents) {
            resolve(webviewContents);
          } else {
            setTimeout(checkForWebview, WEBVIEW_CHECK_INTERVAL);
          }
        };

        checkForWebview();

        setTimeout(() => resolve(null), DEVTOOLS_TIMEOUT);
      }
    );

    if (webviewWebContents && !webviewWebContents.isDestroyed()) {
      console.log('Opening developer tools for video call webview');
      webviewWebContents.openDevTools();
      return true;
    }
    console.warn('Video call webview webContents not found or destroyed');
    return false;
  } catch (error) {
    console.error('Error opening webview developer tools:', error);
    return false;
  }
};

export const cleanupVideoCallResources = () => {
  console.log('Cleaning up all video call resources');

  desktopCapturerCache = null;
  desktopCapturerPromise = null;
  sourceValidationCache.clear();
  sourceValidationCacheTimestamp = 0;

  isVideoCallWindowDestroying = false;
  cleanupVideoCallWindow();
};

handle('video-call-window/test-ipc', async () => {
  console.log('Video call window: IPC test request received');
  return { success: true, timestamp: Date.now() };
});

handle('video-call-window/handshake', async () => {
  console.log('Video call window: Handshake request received');
  return { success: true, timestamp: Date.now() };
});

handle('video-call-window/renderer-ready', async () => {
  console.log('Video call window: Renderer signals ready state');

  if (!videoCallWindow || videoCallWindow.isDestroyed()) {
    console.error(
      'Video call window: Window not available when renderer ready'
    );
    throw new Error('Video call window not available');
  }

  console.log('Video call window: Renderer is ready to request URL');
  return { success: true };
});

handle('video-call-window/request-url', async () => {
  console.log('Video call window: Renderer requesting pending URL');

  if (!videoCallWindow || videoCallWindow.isDestroyed()) {
    console.error(
      'Video call window: Window not available when requesting URL'
    );
    return { success: false, url: null, autoOpenDevtools: false };
  }

  if (!pendingVideoCallUrl) {
    console.error('Video call window: No pending URL available');
    return { success: false, url: null, autoOpenDevtools: false };
  }

  const state = select((state) => ({
    isAutoOpenEnabled: state.isVideoCallDevtoolsAutoOpenEnabled,
  }));

  console.log(
    'Video call window: Providing URL to renderer:',
    pendingVideoCallUrl
  );

  return {
    success: true,
    url: pendingVideoCallUrl,
    autoOpenDevtools: state.isAutoOpenEnabled,
  };
});

handle('video-call-window/url-received', async () => {
  console.log('Video call window: URL received confirmation from renderer');
  return { success: true };
});

handle('video-call-window/webview-created', async () => {
  console.log('Video call window: Webview created confirmation');
  return { success: true };
});

handle('video-call-window/webview-loading', async () => {
  console.log('Video call window: Webview started loading');
  return { success: true };
});

handle('video-call-window/webview-ready', async () => {
  console.log('Video call window: Webview finished loading');
  return { success: true };
});

handle('video-call-window/webview-failed', async (_webContents, error) => {
  console.error('Video call window: Webview failed to load:', error);
  return { success: true };
});

handle('video-call-window/get-language', async () => {
  console.log('Video call window: Language request received');

  // Import the i18n service to get the current language
  try {
    const { getLanguage } = await import('../i18n/main');
    console.log('Video call window: Providing language:', getLanguage);
    return { success: true, language: getLanguage };
  } catch (error) {
    console.error('Video call window: Failed to get language:', error);
    return { success: true, language: fallbackLng };
  }
});

handle('video-call-window/prewarm-capturer-cache', async () => {
  refreshDesktopCapturerCache({ types: ['window', 'screen'] });
  return { success: true };
});
