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
  shell,
  webContents,
} from 'electron';

import { packageJsonInformation } from '../app/main/app';
import { handle } from '../ipc/main';
import { isProtocolAllowed } from '../navigation/main';
import { select, dispatchLocal } from '../store';
import { VIDEO_CALL_WINDOW_STATE_CHANGED } from '../ui/actions';
import { debounce } from '../ui/main/debounce';
import { askForMediaPermissionSettings } from '../ui/main/dialogs';
import { isInsideSomeScreen, getRootWindow } from '../ui/main/rootWindow';
import { openExternal } from '../utils/browserLauncher';

// Singleton video call window instance
let videoCallWindow: BrowserWindow | null = null;

// Desktop capturer caching and debouncing
let desktopCapturerCache: {
  sources: Electron.DesktopCapturerSource[];
  timestamp: number;
} | null = null;

let desktopCapturerPromise: Promise<Electron.DesktopCapturerSource[]> | null =
  null;

const DESKTOP_CAPTURER_CACHE_TTL = 3000; // 3 seconds cache for thumbnails (keeps screen content fresh)

// Source validation cache to avoid redundant thumbnail checks
// Two-tier caching strategy:
// - Thumbnail cache (3s): Updates screen content regularly for current display
// - Validation cache (30s): Remembers which source IDs work, avoiding expensive validation
const sourceValidationCache: Set<string> = new Set();
let sourceValidationCacheTimestamp = 0;
const SOURCE_VALIDATION_CACHE_TTL = 30000; // 30 seconds cache for validation - longer since source IDs don't change often

// Cache cleanup timer - clears cache after window closes if no new window opens
let cacheCleanupTimer: NodeJS.Timeout | null = null;
const CACHE_CLEANUP_DELAY = 60000; // 60 seconds delay before clearing cache

// Resource tracking for debugging
let videoCallWindowCreationCount = 0;
let videoCallWindowDestructionCount = 0;

const logVideoCallWindowStats = () => {
  console.log('Video call window stats:', {
    created: videoCallWindowCreationCount,
    destroyed: videoCallWindowDestructionCount,
    currentInstance: videoCallWindow ? 'active' : 'none',
    cacheStatus: desktopCapturerCache ? 'cached' : 'empty',
    promiseStatus: desktopCapturerPromise ? 'pending' : 'none',
    cleanupTimer: cacheCleanupTimer ? 'active' : 'none',
  });
};

export const handleDesktopCapturerGetSources = () => {
  handle('desktop-capturer-get-sources', async (_webContents, opts) => {
    try {
      const options = Array.isArray(opts) ? opts[0] : opts;

      // Two-tier caching: Check if we have recent thumbnails (3s cache)
      // This ensures screen content stays current while still optimizing performance
      if (
        desktopCapturerCache &&
        Date.now() - desktopCapturerCache.timestamp < DESKTOP_CAPTURER_CACHE_TTL
      ) {
        return desktopCapturerCache.sources;
      }

      // If there's already a pending request, wait for it
      if (desktopCapturerPromise) {
        return await desktopCapturerPromise;
      }

      // Create new request
      desktopCapturerPromise = (async () => {
        try {
          const sources = await desktopCapturer.getSources(options);

          // Filter out invalid sources before returning
          const validSources = sources.filter((source) => {
            if (!source.name || source.name.trim() === '') {
              return false;
            }

            // Validation cache (30s): Check if we've already validated this source ID
            // This allows thumbnail refresh (3s) while avoiding expensive validation
            const now = Date.now();
            const cacheExpired =
              now - sourceValidationCacheTimestamp >
              SOURCE_VALIDATION_CACHE_TTL;

            // If source was previously validated and cache is still valid, skip thumbnail check
            if (!cacheExpired && sourceValidationCache.has(source.id)) {
              return true; // Trust previously validated source, fresh thumbnail already fetched
            }

            // For new sources or expired cache, validate thumbnail
            if (source.thumbnail.isEmpty()) {
              return false;
            }

            // Add newly validated source to cache
            if (cacheExpired) {
              sourceValidationCache.clear();
              sourceValidationCacheTimestamp = now;
            }
            sourceValidationCache.add(source.id);

            return true;
          });

          // Cache the result
          desktopCapturerCache = {
            sources: validSources,
            timestamp: Date.now(),
          };

          return validSources;
        } catch (error) {
          console.error('Error getting desktop capturer sources:', error);

          // Clear cache on error
          desktopCapturerCache = null;

          return [];
        } finally {
          // Clear the promise reference
          desktopCapturerPromise = null;
        }
      })();

      return await desktopCapturerPromise;
    } catch (error) {
      console.error('Error in desktop capturer handler:', error);

      // Clear cache and promise on error
      desktopCapturerCache = null;
      desktopCapturerPromise = null;

      return [];
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
  if (videoCallWindow && !videoCallWindow.isDestroyed()) {
    console.log('Cleaning up video call window resources');

    // Remove all event listeners to prevent memory leaks
    videoCallWindow.removeAllListeners();

    // Close the window
    videoCallWindow.close();
  }

  videoCallWindow = null;
  videoCallWindowDestructionCount++;

  // Note: Desktop capturer cache will be cleaned up by timer if no new window opens

  console.log('Video call window cleanup completed');
  logVideoCallWindowStats();
};

const setupWebviewHandlers = (webContents: WebContents) => {
  // Handle webview attachment for screen sharing
  const handleDidAttachWebview = (
    _event: Event,
    webviewWebContents: WebContents
  ): void => {
    // Set up screen sharing handler for the webview
    webviewWebContents.session.setDisplayMediaRequestHandler((_request, cb) => {
      if (videoCallWindow && !videoCallWindow.isDestroyed()) {
        videoCallWindow.webContents.send(
          'video-call-window/open-screen-picker'
        );

        // Listen for screen sharing source response
        ipcMain.once(
          'video-call-window/screen-sharing-source-responded',
          async (_event, sourceId) => {
            if (!sourceId) {
              // @ts-expect-error - cb expects specific format
              cb(null);
              return;
            }

            try {
              // Re-fetch sources to ensure the selected source is still valid
              const sources = await desktopCapturer.getSources({
                types: ['window', 'screen'],
              });

              // Find the selected source
              const selectedSource = sources.find((s) => s.id === sourceId);

              if (!selectedSource) {
                console.warn(
                  'Selected screen sharing source no longer available:',
                  sourceId
                );
                // @ts-expect-error - cb expects specific format
                cb(null);
                return;
              }

              // If a source was selected from the screen picker, it was already
              // validated and displayed with a thumbnail. No need for additional
              // thumbnail validation that could reject valid sources.

              cb({ video: selectedSource });
            } catch (error) {
              console.error('Error validating screen sharing source:', error);
              // @ts-expect-error - cb expects specific format
              cb(null);
            }
          }
        );
      }
    });
  };

  // Remove existing listener to prevent duplicates
  webContents.removeAllListeners('did-attach-webview');

  // Listen for webview attachment
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
    // Always create a fresh window - no reuse to prevent any resource accumulation
    if (videoCallWindow && !videoCallWindow.isDestroyed()) {
      console.log('Closing existing video call window to create fresh one');
      videoCallWindow.close();
      videoCallWindow = null;
    }

    const validUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    if (validUrl.hostname.match(/(\.)?g\.co$/)) {
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

      // Get persisted window state and persistence setting
      const state = select((state) => ({
        videoCallWindowState: state.videoCallWindowState,
        isVideoCallWindowPersistenceEnabled:
          state.isVideoCallWindowPersistenceEnabled,
      }));

      let { x, y, width, height } = state.videoCallWindowState.bounds;

      // If persistence is disabled or no valid state exists, calculate default position and size
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

      // Cancel any pending cache cleanup since we're creating a new window
      if (cacheCleanupTimer) {
        clearTimeout(cacheCleanupTimer);
        cacheCleanupTimer = null;
        console.log(
          'Cancelled cache cleanup - creating new window, cache preserved for better performance'
        );
      }

      logVideoCallWindowStats();
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
          // Performance optimizations for low-power devices
          experimentalFeatures: false,
          offscreen: false,
          // Disable hardware acceleration in low-memory situations
          // This helps prevent crashes on low-end hardware
          disableHtmlFullscreenWindowResize: true,
          // Enable background throttling to improve performance
          backgroundThrottling: true,
          // Optimize memory usage
          v8CacheOptions: 'bypassHeatCheck',
          // Enable spellcheck to reduce memory pressure
          spellcheck: false,
        },
        show: false,
        // Performance optimizations
        frame: true,
        transparent: false,
        // Reduce memory usage
        skipTaskbar: false,
      });

      // Block navigation to smb:// protocol
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

      // Set up window state persistence if enabled
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

      // Handle window close event for complete cleanup
      videoCallWindow.on('closed', () => {
        console.log('Video call window closed - destroying completely');
        videoCallWindow = null;
        videoCallWindowDestructionCount++;

        // Start timer to clear desktop capturer cache after delay
        // This allows quick reopening to reuse cache while cleaning up memory if user is done
        cacheCleanupTimer = setTimeout(() => {
          console.log(
            'Clearing desktop capturer cache after window idle period'
          );
          desktopCapturerCache = null;
          desktopCapturerPromise = null;
          sourceValidationCache.clear();
          sourceValidationCacheTimestamp = 0;
          cacheCleanupTimer = null;
          console.log('Desktop capturer cache cleared due to inactivity');
        }, CACHE_CLEANUP_DELAY);

        console.log(
          `Desktop capturer cache will be cleared in ${CACHE_CLEANUP_DELAY / 1000} seconds if no new video call window is opened`
        );
        logVideoCallWindowStats();
      });

      // Handle window close attempt
      videoCallWindow.on('close', (_event) => {
        // Allow normal close behavior, complete cleanup happens in 'closed' event
      });

      // Add error handling for window loading failures
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

      // Add diagnostics for JavaScript execution issues
      videoCallWindow.webContents.on('dom-ready', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Video call window DOM ready');
        }

        // Check if JavaScript is working by injecting a simple test
        videoCallWindow?.webContents
          .executeJavaScript(
            `
          if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
            console.log('Video call window: JavaScript execution test successful');
          }
          window.videoCallWindowJSWorking = true;
          // Test if React has actually rendered content (more reliable than checking window.React)
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
          }, 5000); // Increased timeout to 5 seconds to allow for slower React mounting
        `
          )
          .catch((error) => {
            console.error(
              'Video call window: JavaScript execution test failed:',
              error
            );
          });
      });

      // Enhanced console message handling for better debugging
      videoCallWindow.webContents.on(
        'console-message',
        (_event, level, message, line, sourceId) => {
          const logPrefix = 'Video call window console:';
          switch (level) {
            case 0: // Info
              console.log(
                `${logPrefix} [INFO]`,
                message,
                `(${sourceId}:${line})`
              );
              break;
            case 1: // Warning
              console.warn(
                `${logPrefix} [WARN]`,
                message,
                `(${sourceId}:${line})`
              );
              break;
            case 2: // Error
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

      videoCallWindow.loadFile(htmlPath).catch((error) => {
        console.error('Video call window: Failed to load HTML file:', error);
        console.error(
          'This may indicate build issues or file system problems on low-power devices'
        );
      });

      videoCallWindow.once('ready-to-show', () => {
        if (videoCallWindow && !videoCallWindow.isDestroyed()) {
          videoCallWindow.setTitle(packageJsonInformation.productName);

          // Track if webview has started loading (indicates URL was received)
          let webviewStartedLoading = false;

          // Listen for webview loading events as confirmation
          const handleWebviewStarted = () => {
            webviewStartedLoading = true;
          };

          // Monitor console messages for webview load start
          videoCallWindow.webContents.on(
            'console-message',
            (_event, _level, message) => {
              if (
                message.includes('Load started') ||
                message.includes('did-start-loading')
              ) {
                handleWebviewStarted();
              }
            }
          );

          // Add a delay before sending the URL to ensure JavaScript has loaded
          // This is especially important for low-power devices
          const sendUrlWithDelay = () => {
            // Check if auto-open devtools is enabled and send it with the URL
            const isAutoOpenEnabled = select(
              (state) => state.isVideoCallDevtoolsAutoOpenEnabled
            );

            console.log('Video call window: Sending URL to renderer:', url);
            videoCallWindow?.webContents.send(
              'video-call-window/open-url',
              url,
              isAutoOpenEnabled
            );
          };

          // Immediate attempt
          sendUrlWithDelay();

          // Fallback attempt after 3 seconds ONLY if webview hasn't started loading
          setTimeout(() => {
            if (
              videoCallWindow &&
              !videoCallWindow.isDestroyed() &&
              !webviewStartedLoading
            ) {
              console.log(
                'Video call window: Fallback URL send - webview has not started loading'
              );
              sendUrlWithDelay();
            } else if (
              webviewStartedLoading &&
              process.env.NODE_ENV === 'development'
            ) {
              console.log(
                'Video call window: Fallback send skipped - webview already loading'
              );
            }
          }, 3000); // Increased to 3 seconds to give more time

          videoCallWindow.show();
        }
      });

      // Set up webContents event handlers
      const { webContents } = videoCallWindow;

      // Handle new window creation attempts
      webContents.setWindowOpenHandler(({ url }: { url: string }) => {
        console.log('Video call window - new window requested:', url);

        if (url.toLowerCase().startsWith('smb://')) {
          return { action: 'deny' };
        }

        // For external URLs, open in default browser
        if (url.startsWith('http://') || url.startsWith('https://')) {
          openExternal(url);
          return { action: 'deny' };
        }

        // Allow other window opens to proceed normally
        return { action: 'allow' };
      });

      // Handle navigation to external protocols in video call windows
      webContents.on('will-navigate', (event: any, url: string) => {
        console.log('Video call window will-navigate:', url);

        try {
          const parsedUrl = new URL(url);

          // Check if this is an external protocol (not http/https)
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
          // If URL parsing fails, let the default handling proceed
          console.warn('Failed to parse URL in video call window:', url, e);
        }
      });

      // Handle webview attachment for screen sharing
      setupWebviewHandlers(webContents);

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

              if (process.platform === 'darwin') {
                const allowed =
                  (!mediaTypes.includes('audio') ||
                    (await systemPreferences.askForMediaAccess(
                      'microphone'
                    ))) &&
                  (!mediaTypes.includes('video') ||
                    (await systemPreferences.askForMediaAccess('camera')));
                callback(allowed);
                break;
              }

              // For non-macOS platforms (including Linux), check system permissions on Windows only
              if (process.platform === 'win32') {
                let microphoneAllowed = true;
                let cameraAllowed = true;

                if (mediaTypes.includes('audio')) {
                  const micStatus =
                    systemPreferences.getMediaAccessStatus('microphone');
                  microphoneAllowed = micStatus === 'granted';
                }

                if (mediaTypes.includes('video')) {
                  const camStatus =
                    systemPreferences.getMediaAccessStatus('camera');
                  cameraAllowed = camStatus === 'granted';
                }

                const allowed = microphoneAllowed && cameraAllowed;

                if (!allowed) {
                  console.log('Media permissions denied by system:', {
                    microphone: microphoneAllowed,
                    camera: cameraAllowed,
                    requestedTypes: mediaTypes,
                  });

                  let permissionType: 'microphone' | 'camera' | 'both';
                  if (
                    mediaTypes.includes('audio') &&
                    mediaTypes.includes('video')
                  ) {
                    permissionType = 'both';
                  } else if (mediaTypes.includes('audio')) {
                    permissionType = 'microphone';
                  } else {
                    permissionType = 'camera';
                  }

                  if (videoCallWindow && !videoCallWindow.isDestroyed()) {
                    askForMediaPermissionSettings(
                      permissionType,
                      videoCallWindow
                    ).then((openSettings) => {
                      if (openSettings) {
                        shell.openExternal('ms-settings:privacy-microphone');
                      }
                    });
                  }
                }

                callback(allowed);
                break;
              }

              // For Linux and other platforms, always allow media access
              callback(true);
              break;
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
              // Allow external protocol handling for video call windows
              // This is essential for Zoom, Teams, and other external app launches
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

  // Handle close request from Jitsi bridge or other sources
  handle('video-call-window/close-requested', async () => {
    if (videoCallWindow && !videoCallWindow.isDestroyed()) {
      videoCallWindow.close();
    }
  });

  // Handle developer tools request for video call window webview
  handle('video-call-window/open-webview-dev-tools', async () => {
    if (!videoCallWindow || videoCallWindow.isDestroyed()) {
      console.warn('Video call window not available for dev tools');
      return false;
    }

    try {
      // Find the webview webContents by looking for attached webviews
      const webviewWebContents = await new Promise<WebContents | null>(
        (resolve) => {
          const checkForWebview = () => {
            // Get all webContents
            const allWebContents = webContents.getAllWebContents();

            // Find webContents that belongs to our video call window's webview
            const webviewContents = allWebContents.find((wc) => {
              // Check if this webContents has our video call window as parent
              return wc.hostWebContents === videoCallWindow?.webContents;
            });

            if (webviewContents) {
              resolve(webviewContents);
            } else {
              // If not found immediately, wait a bit and try again
              setTimeout(checkForWebview, 100);
            }
          };

          checkForWebview();

          // Timeout after 2 seconds
          setTimeout(() => resolve(null), 2000);
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

// Export function to open webview developer tools (for direct calling from main process)
export const openVideoCallWebviewDevTools = async (): Promise<boolean> => {
  if (!videoCallWindow || videoCallWindow.isDestroyed()) {
    console.warn('Video call window not available for dev tools');
    return false;
  }

  try {
    // Find the webview webContents by looking for attached webviews
    const webviewWebContents = await new Promise<WebContents | null>(
      (resolve) => {
        const checkForWebview = () => {
          // Get all webContents
          const allWebContents = webContents.getAllWebContents();

          // Find webContents that belongs to our video call window's webview
          const webviewContents = allWebContents.find((wc: WebContents) => {
            // Check if this webContents has our video call window as parent
            return wc.hostWebContents === videoCallWindow?.webContents;
          });

          if (webviewContents) {
            resolve(webviewContents);
          } else {
            // If not found immediately, wait a bit and try again
            setTimeout(checkForWebview, 100);
          }
        };

        checkForWebview();

        // Timeout after 2 seconds
        setTimeout(() => resolve(null), 2000);
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

// Export cleanup function for use in app shutdown
export const cleanupVideoCallResources = () => {
  console.log('Cleaning up all video call resources');

  // Clear any pending cache cleanup timer
  if (cacheCleanupTimer) {
    clearTimeout(cacheCleanupTimer);
    cacheCleanupTimer = null;
    console.log('Cancelled pending cache cleanup timer');
  }

  // Clear desktop capturer cache immediately on app shutdown
  desktopCapturerCache = null;
  desktopCapturerPromise = null;
  sourceValidationCache.clear();
  sourceValidationCacheTimestamp = 0;

  cleanupVideoCallWindow();
};

// IPC handler to test communication with the renderer process
// This helps diagnose IPC issues on low-power devices
handle('video-call-window/test-ipc', async () => {
  console.log('Video call window: IPC test request received');
  return { success: true, timestamp: Date.now() };
});
