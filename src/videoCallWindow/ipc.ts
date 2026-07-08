import path from 'path';
import process from 'process';

import type {
  Event,
  WebContents,
  MediaAccessPermissionRequest,
} from 'electron';
import { app, BrowserWindow, ipcMain, screen, webContents } from 'electron';

import { packageJsonInformation } from '../app/main/app';
import { fallbackLng } from '../i18n/common';
import { handle } from '../ipc/main';
import { isProtocolAllowed } from '../navigation/main';
import { ScreenSharingRequestTracker } from '../screenSharing/ScreenSharingRequestTracker';
import {
  clearDesktopCapturerCache,
  getDesktopCapturerCacheStatus,
  prewarmDesktopCapturerCache,
} from '../screenSharing/desktopCapturerCache';
import { requestViaPickerWindow } from '../screenSharing/popoutPickerRequest';
import type {
  DisplayMediaCallback,
  ScreenPickerProvider,
} from '../screenSharing/screenPicker/types';
import { checkScreenRecordingPermission } from '../screenSharing/screenRecordingPermission';
import {
  handleServerViewDisplayMediaRequest,
  resolveStandaloneOriginWindow,
  setupServerViewDisplayMedia,
} from '../screenSharing/serverViewScreenSharing';
import { select, dispatchLocal } from '../store';
import { VIDEO_CALL_WINDOW_STATE_CHANGED } from '../ui/actions';
import { debounce } from '../ui/main/debounce';
import { handleMediaPermissionRequest } from '../ui/main/mediaPermissions';
import { isInsideSomeScreen, getRootWindow } from '../ui/main/rootWindow';
import {
  getServerUrlByWebContentsId,
  getWebContentsByServerUrl,
  setupServerViewPermissionHandler,
} from '../ui/main/serverView';
import { openExternal } from '../utils/browserLauncher';

// Alias to reach the WebContents static methods (e.g. fromFrame) from inside
// functions that shadow `webContents` with a parameter of the same name.
const electronWebContents = webContents;

const DESTRUCTION_CHECK_INTERVAL = 50;
const DEVTOOLS_TIMEOUT = 2000;
const WEBVIEW_CHECK_INTERVAL = 100;

let videoCallWindow: BrowserWindow | null = null;
let isVideoCallWindowDestroying = false;
let pendingVideoCallUrl: string | null = null;
// READ ONLY by the renderer handshake (the BrowserWindow `loadFile` query
// payload, and the `video-call-window/request-url` IPC response). It carries
// the originating server's partition (`persist:<serverUrl>`) so the call shares
// the main webview's cookies + localStorage. Do NOT read it for any lifecycle
// decision — those go through `activeCall` instead.
let pendingVideoCallPartition: string | null = null;

const FALLBACK_PARTITION = 'persist:jitsi-session';
type ActiveCall = {
  url: string; // the conference URL this window was opened for
  partition: string; // 'persist:<serverUrl>' OR the fallback — always truthy
  isSharedSession: boolean; // true only when a real server URL resolved
  serverWebContentsId: number | null;
};
let activeCall: ActiveCall | null = null;
// Serializes open-window requests so two near-simultaneous opens can't both pass
// the destruction/existing-window guards and race into `new BrowserWindow`.
let openWindowQueue: Promise<unknown> = Promise.resolve();
let videoCallCredentials: {
  userId: string;
  authToken: string;
  serverUrl: string;
} | null = null;
let videoCallProviderName: string | null = null;

const videoCallScreenSharingTracker = new ScreenSharingRequestTracker(
  'video-call-window/screen-sharing-source-responded',
  'Video call screen sharing'
);

const VIDEO_CALL_PICKER_CHANNELS = {
  response: 'video-call-window/screen-sharing-source-responded',
  permission: 'video-call-window/screen-recording-is-permission-granted',
  openUrl: 'video-call-window/open-url',
};

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

let videoCallWindowCreationCount = 0;
let videoCallWindowDestructionCount = 0;

const logVideoCallWindowStats = () => {
  const cacheStatus = getDesktopCapturerCacheStatus();
  console.log('Video call window stats:', {
    created: videoCallWindowCreationCount,
    destroyed: videoCallWindowDestructionCount,
    currentInstance: videoCallWindow ? 'active' : 'none',
    cacheStatus: cacheStatus.cached ? 'cached' : 'empty',
    promiseStatus: cacheStatus.pending ? 'pending' : 'none',
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

// Restore the plain server-view display-media handler on the originating
// server's session after a call window's unified handler took it over. Safe to
// call from every teardown path: it re-resolves the live server webContents and
// is idempotent (last-writer-wins, app-singleton provider). It must NOT null
// `activeCall` — each teardown path re-resolves the live server webContents.
const restoreServerViewHandler = async (
  call: ActiveCall | null
): Promise<void> => {
  if (!call?.isSharedSession) return; // isolated/fallback sessions: nothing to restore
  const serverUrl = call.partition.replace(/^persist:/, '');
  const serverWc = getWebContentsByServerUrl(serverUrl);
  if (serverWc && !serverWc.isDestroyed()) {
    setupServerViewDisplayMedia(serverWc);
  }

  // The shared-session teardown reset the permission handler to deny-all,
  // which also kills permission prompts on the live main webview. Restore it.
  // getRootWindow() can reject during teardown/before-quit (root window not
  // initialized or already destroyed); only the permission-handler restore is
  // skipped on failure — the display-media restore above always runs.
  try {
    const rootWindow = await getRootWindow();
    // Re-check after the await: getRootWindow yields the event loop.
    if (serverWc && !serverWc.isDestroyed() && rootWindow) {
      setupServerViewPermissionHandler(serverWc, rootWindow);
    }
  } catch (error) {
    console.warn(
      'Video call window: could not restore server-view permission handler',
      error
    );
  }
};

const cleanupVideoCallWindow = () => {
  const capturedCall = activeCall;
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
          // Don't reset the permission handler when sharing the server's
          // session — it would disable permissions on the live main webview.
          if (!capturedCall?.isSharedSession) {
            webviewContents.session.setPermissionRequestHandler(() => false);
          }
          webviewContents.loadURL('about:blank').catch(() => {});
        }
      } catch (error) {
        console.log(
          'Could not clean webview contents, continuing with window cleanup'
        );
      }

      // Restore the server-view display-media handler that this call's unified
      // handler took over (no-op on isolated/fallback sessions).
      void restoreServerViewHandler(capturedCall);

      // Tear down screen sharing (active + queued) before removing window
      // listeners — silent cleanup() would orphan a popout-parented picker
      // window whose request is still pending.
      videoCallScreenSharingTracker.cancelAll();

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

  // Clear credentials immediately during cleanup
  videoCallCredentials = null;

  // Use setTimeout to ensure this cleanup happens after any window events are processed
  setTimeout(() => {
    videoCallWindow = null;
    isVideoCallWindowDestroying = false;
    videoCallWindowDestructionCount++;
    // Only clear `activeCall` if it still belongs to this teardown — a stale
    // prior-window teardown firing later must not wipe a freshly-set newer call.
    if (activeCall === capturedCall) activeCall = null;

    console.log('Video call window cleanup completed');
    logVideoCallWindowStats();
  }, 10);
};

// Internal picker handler function - uses shared tracker
const createInternalPickerHandler =
  (): ((
    callback: DisplayMediaCallback,
    originWindow?: BrowserWindow
  ) => void) =>
  (cb, originWindow) => {
    if (
      originWindow &&
      originWindow !== videoCallWindow &&
      !originWindow.isDestroyed()
    ) {
      requestViaPickerWindow(
        videoCallScreenSharingTracker,
        originWindow,
        VIDEO_CALL_PICKER_CHANNELS,
        cb
      );
      return;
    }

    if (!videoCallWindow || videoCallWindow.isDestroyed()) {
      console.warn(
        'Screen sharing request rejected - video call window not available'
      );
      cb({ video: false } as any);
      return;
    }

    const window = videoCallWindow;
    videoCallScreenSharingTracker.createRequest(cb, () => {
      window.webContents.send('video-call-window/open-screen-picker');
    });
  };

// Schemes a conference page legitimately opens as an in-app popup (device
// pickers, transient PDF/export blobs). Everything else that isn't external
// http(s) is denied so a compromised conference frame can't spawn an Electron
// window pointed at `javascript:`, `data:`, `file:`, etc.
const ALLOWED_POPUP_SCHEMES = ['about:', 'blob:'];

// Window-open policy shared by the video call window's host page and its
// conference webview: route external http(s) links (target="_blank" /
// window.open) to the system browser and deny the Electron popup, allow the
// in-app popup schemes above, and deny everything else. Mirrors the main app
// window's intent while keeping the popup surface closed by default.
const handleVideoCallWindowOpen = ({
  url,
}: {
  url: string;
}): { action: 'deny' } | { action: 'allow' } => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    openExternal(url);
    return { action: 'deny' };
  }
  const lower = url.toLowerCase();
  if (ALLOWED_POPUP_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
    return { action: 'allow' };
  }
  return { action: 'deny' };
};

const setupWebviewHandlers = (webContents: WebContents) => {
  // Track attached webviews that need handler setup
  const pendingWebviews: WebContents[] = [];
  let screenPickerReady = false;
  let provider: ScreenPickerProvider | null = null;

  // Function to set up display media handler for a webview
  const setupDisplayMediaHandler = (webviewWebContents: WebContents): void => {
    if (!provider) return;
    const currentProvider = provider; // Capture for closure
    // When the call shares the server's session, this single per-session handler
    // also serves the main server webview, so it must route by origin. Snapshot
    // the active call at attach time; the routing decision reads it at request
    // time via `call?.isSharedSession`.
    const call = activeCall;
    try {
      // useSystemPicker is an experimental macOS 15+ option; not available on other platforms.
      // We set it to false unconditionally and use the callback handler on all platforms to
      // enable custom source selection (including PipeWire on Wayland via XDG portal).
      webviewWebContents.session.setDisplayMediaRequestHandler(
        (request, cb) => {
          try {
            const originWindow = resolveStandaloneOriginWindow(request.frame);
            // The root window can't originate a request on this session, and
            // the call window itself is handled by the internal picker path
            // below — only a genuine popout (e.g. a webapp window.open) needs
            // its own picker window.
            const popoutOrigin =
              originWindow && originWindow !== videoCallWindow
                ? originWindow
                : null;

            // On a shared session, route by originating frame: in-call requests
            // use the call window's picker; anything else (the main server
            // webview, or a popout sharing this session) falls back to the
            // server-view picker.
            if (call?.isSharedSession) {
              const originWebContents = request.frame
                ? electronWebContents.fromFrame(request.frame)
                : null;
              const fromCallWindow =
                !!originWebContents &&
                originWebContents.hostWebContents?.id ===
                  videoCallWindow?.webContents.id;
              if (!fromCallWindow) {
                handleServerViewDisplayMediaRequest(
                  cb,
                  popoutOrigin ?? undefined
                );
                return;
              }
            }
            currentProvider.handleDisplayMediaRequest(
              cb,
              popoutOrigin ?? undefined
            );
          } catch (error) {
            console.error('Error in screen picker handler:', error);
            cb({ video: false } as any);
          }
        },
        { useSystemPicker: false } // Always false - portal handled via callback on Linux
      );
    } catch (error) {
      console.error('Error setting up display media request handler:', error);
    }
  };

  // Register listener SYNCHRONOUSLY before async work
  const handleDidAttachWebview = (
    _event: Event,
    webviewWebContents: WebContents
  ): void => {
    // Route external links opened from the conference (target="_blank" /
    // window.open) to the system browser instead of spawning a new Electron
    // window, mirroring the main app window.
    webviewWebContents.setWindowOpenHandler(handleVideoCallWindowOpen);

    // Send external-protocol target="_self" navigations (mailto:, tel:, custom
    // schemes) to the browser too; http(s) self-navigations stay in the webview
    // so the conference's own flows (auth redirects, etc.) keep working.
    webviewWebContents.on('will-navigate', (event: Event, navUrl: string) => {
      try {
        const { protocol } = new URL(navUrl);
        if (
          !['http:', 'https:', 'file:', 'data:', 'about:', 'blob:'].includes(
            protocol
          )
        ) {
          event.preventDefault();
          isProtocolAllowed(navUrl).then((allowed) => {
            if (allowed) {
              openExternal(navUrl);
            }
          });
        }
      } catch {
        // Ignore unparseable URLs.
      }
    });

    // Media (mic/cam) permission requests from the conference originate in the
    // webview's session, NOT the host window's, so the handler must live on the
    // webview partition. On a SHARED session that partition already carries the
    // server view's permission handler (installed for the main webview) — leave
    // it untouched so we don't clobber it. Only the isolated FALLBACK partition
    // (`persist:jitsi-session`) has no handler of its own; install one there so
    // the call still routes through the app's `handleMediaPermissionRequest`
    // flow instead of relying on Electron's silent default-grant.
    const call = activeCall;
    if (!call?.isSharedSession) {
      webviewWebContents.session.setPermissionRequestHandler(
        async (_webContents, permission, callback, details) => {
          if (permission === 'media') {
            const { mediaTypes = [] } = details as MediaAccessPermissionRequest;
            try {
              await handleMediaPermissionRequest(
                mediaTypes as ReadonlyArray<'audio' | 'video'>,
                videoCallWindow,
                'initiateCall',
                callback
              );
            } catch (error) {
              console.error(
                'Error handling media permission request in video call webview:',
                error
              );
              callback(false);
            }
            return;
          }

          switch (permission) {
            case 'geolocation':
            case 'notifications':
            case 'midiSysex':
            case 'pointerLock':
            case 'fullscreen':
              callback(true);
              return;
            case 'openExternal':
              callback(true);
              return;
            default:
              callback(false);
          }
        }
      );
    }

    if (screenPickerReady && provider) {
      setupDisplayMediaHandler(webviewWebContents);
    } else {
      pendingWebviews.push(webviewWebContents);
    }
  };

  webContents.removeAllListeners('did-attach-webview');
  webContents.on('did-attach-webview', handleDidAttachWebview);

  // Load screen picker module asynchronously
  import('../screenSharing/screenPicker')
    .then((screenPickerModule) => {
      const { createScreenPicker, InternalPickerProvider } = screenPickerModule;
      provider = createScreenPicker();

      if (provider instanceof InternalPickerProvider) {
        provider.setHandleRequestHandler(createInternalPickerHandler());
      }

      screenPickerReady = true;

      // Set up handlers for any webviews that attached while loading
      for (const webviewWebContents of pendingWebviews) {
        if (!webviewWebContents.isDestroyed()) {
          setupDisplayMediaHandler(webviewWebContents);
        }
      }
      pendingWebviews.length = 0;
    })
    .catch((error) => {
      console.error('Error loading screen picker module:', error);
      // Don't prevent webview from loading if screen picker setup fails
    });
};

// eslint-disable-next-line complexity
const openVideoCallWindow = async (
  _wc: WebContents,
  url: string,
  options?: {
    providerName?: string;
    credentials?: { userId: string; authToken: string };
  }
): Promise<void> => {
  console.log('Video call window: Open-window handler called with URL:', url);

  // If a window for the same conference is already open, just focus it instead
  // of tearing it down and recreating it. (`activeCall` still holds the current
  // call here — it's only reassigned for the new call further below.)
  if (
    videoCallWindow &&
    !videoCallWindow.isDestroyed() &&
    !isVideoCallWindowDestroying &&
    activeCall?.url === url
  ) {
    console.log(
      'Video call window: same conference already open, focusing existing window'
    );
    if (videoCallWindow.isMinimized()) {
      videoCallWindow.restore();
    }
    videoCallWindow.show();
    videoCallWindow.focus();
    return;
  }

  // Store provider name and credentials
  videoCallProviderName = options?.providerName ?? null;
  videoCallCredentials = null;
  if (options?.providerName === 'pexip' && options?.credentials) {
    try {
      const serverOrigin = new URL(_wc.getURL()).origin;
      videoCallCredentials = {
        userId: options.credentials.userId,
        authToken: options.credentials.authToken,
        serverUrl: serverOrigin,
      };
    } catch {
      // _wc.getURL() may not be a valid URL in edge cases
      videoCallCredentials = null;
    }
  }

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

  // Validate the protocol up front (fail closed). This must run BEFORE the
  // g.co external-open special-case so a disallowed protocol (e.g. ftp://)
  // can never reach openExternal.
  if (!allowedProtocols.includes(validUrl.protocol)) {
    throw new Error(
      `Invalid video call URL protocol: ${validUrl.protocol}. Only http: and https: are allowed.`
    );
  }

  // Exact host match (or a true subdomain of g.co) — avoids overmatching
  // hostnames like `evilg.co` that a `(\.)?g\.co$` regex would accept.
  if (validUrl.hostname === 'g.co' || validUrl.hostname.endsWith('.g.co')) {
    console.log(
      'Video call window: Google URL detected, opening externally instead of internal window'
    );
    openExternal(validUrl.toString());
    return;
  }
  // The protocol is already validated above (fail-closed throw) and the g.co
  // external-open case has returned, so by here a window WILL be created.
  // Resolve the partition and set `activeCall` now — doing it earlier would
  // leave stale state behind for opens that bail out before `new BrowserWindow`,
  // which a later teardown could misread.
  //
  // Always load the call webview in the originating server's partition so it
  // shares the main webview's session (cookies + localStorage). When the
  // server can't be resolved, fall back to an isolated jitsi-session partition.
  {
    const serverUrl = getServerUrlByWebContentsId(_wc.id);
    const partition = serverUrl ? `persist:${serverUrl}` : FALLBACK_PARTITION;
    activeCall = {
      url,
      partition,
      isSharedSession: Boolean(serverUrl),
      serverWebContentsId: serverUrl ? _wc.id : null,
    };
    pendingVideoCallPartition = partition; // handshake global only
    if (activeCall.isSharedSession) {
      console.log(
        'Video call window: sharing server session via partition',
        partition
      );
    } else {
      console.warn(
        'Video call window: could not resolve originating server; opening with isolated fallback partition',
        partition
      );
    }

    const mainWindow = await getRootWindow();
    const winBounds = mainWindow.getNormalBounds();

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

    // Capture per-window so a later call opening (which resets the module
    // state) can't change which server's handlers this window restores.
    const capturedCall = activeCall;

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

      // Tear down screen sharing (active + queued) — see cancelAll() note above.
      videoCallScreenSharingTracker.cancelAll();

      // This call's unified handler took over the shared session's
      // display-media handler. Restore the plain server-view handler so
      // main-app screen sharing keeps working (no-op on isolated sessions).
      void restoreServerViewHandler(capturedCall);

      // Clear credentials and provider on close
      videoCallCredentials = null;
      videoCallProviderName = null;

      // Use setTimeout to ensure cleanup happens after any potential app lifecycle events
      // This prevents crashes during first launch when timing is critical
      setTimeout(() => {
        try {
          videoCallWindow = null;
          isVideoCallWindowDestroying = false;
          videoCallWindowDestructionCount++;
          // Only clear `activeCall` if it still belongs to this window — a
          // stale prior-window teardown must not wipe a freshly-set newer call.
          if (activeCall === capturedCall) activeCall = null;

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

        // Tear down screen sharing (active + queued) — see cancelAll() note above.
        videoCallScreenSharingTracker.cancelAll();

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

    const htmlPath = path.join(app.getAppPath(), 'app/video-call-window.html');
    console.log('Video call window: Loading HTML file from:', htmlPath);

    videoCallWindow
      .loadFile(htmlPath, {
        query: {
          url,
          autoOpenDevtools: String(state.isAutoOpenEnabled),
          ...(pendingVideoCallPartition && {
            partition: pendingVideoCallPartition,
          }),
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

    // Setup webview handlers (listener registered synchronously, module loads async)
    setupWebviewHandlers(webContents);

    // If the call window's host process crashes, the graceful 'closed' restore
    // never fires — restore the server-view handler here too (idempotent).
    webContents.on('render-process-gone', () => {
      void restoreServerViewHandler(capturedCall);
    });

    // Set the pending URL after window is created to prevent race condition with cleanup
    setPendingVideoCallUrl(url, 'open-window-after-creation');
    console.log(
      'Video call window: Set pending URL after window creation:',
      url
    );

    webContents.setWindowOpenHandler((details: { url: string }) => {
      console.log('Video call window - new window requested:', details.url);
      return handleVideoCallWindowOpen(details);
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
            const { mediaTypes = [] } = details as MediaAccessPermissionRequest;
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
};

export const startVideoCallWindowHandler = (): void => {
  // Sync IPC handler for provider name - used by jitsiBridge preload
  // to skip initialization for non-Jitsi providers without async delay
  ipcMain.on('video-call-window/get-provider-sync', (event) => {
    event.returnValue = videoCallProviderName;
  });

  // Close the video call window on request from its own renderer. The
  // renderer's window.close() can't close a window the main process created, so
  // it asks via this fire-and-forget channel. We resolve the window from the
  // sender (the webview guest's host window), so a renderer can only close its
  // own window.
  ipcMain.on('video-call-window/close', (event) => {
    const { sender } = event;
    const win =
      BrowserWindow.fromWebContents(sender) ??
      (sender.hostWebContents
        ? BrowserWindow.fromWebContents(sender.hostWebContents)
        : null);
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });

  handle('video-call-window/screen-recording-is-permission-granted', async () =>
    checkScreenRecordingPermission()
  );

  handle('video-call-window/open-url', async (_webContents, url) => {
    await openExternal(url);
  });

  // Bring the main app window to the front and ask the active server's web
  // client to navigate to an in-app route. Used by the standalone video-chat
  // window, which has no window.opener and therefore can't reach the main
  // window via the web app's window.open trick.
  handle(
    'video-call-window/open-in-main-window',
    async (callerWebContents, path) => {
      // Defense in depth (the preload validates too): only accept in-app
      // relative routes — reject absolute/protocol-relative/scheme URLs.
      if (
        typeof path !== 'string' ||
        !path.startsWith('/') ||
        path.startsWith('//') ||
        path.startsWith('/\\')
      ) {
        console.warn(
          'Video call window: open-in-main-window rejected non-relative path:',
          path
        );
        return;
      }

      // Resolve the target server webview in priority order:
      // 1. the caller's own server (the conference webview, when resolvable);
      // 2. the server the active call actually belongs to — authoritative, and
      //    avoids navigating a *different* server in a multi-workspace setup;
      // 3. the server currently active in the main window (last-resort guess).
      let serverUrl = getServerUrlByWebContentsId(callerWebContents.id);
      if (!serverUrl && activeCall?.serverWebContentsId != null) {
        serverUrl = getServerUrlByWebContentsId(activeCall.serverWebContentsId);
      }
      if (!serverUrl) {
        const currentView = select((state) => state.currentView);
        if (typeof currentView === 'object' && currentView.url) {
          serverUrl = currentView.url;
          console.warn(
            'Video call window: open-in-main-window could not resolve the call’s origin server; falling back to the active view',
            serverUrl
          );
        }
      }

      const serverWebContents = serverUrl
        ? getWebContentsByServerUrl(serverUrl)
        : undefined;
      if (!serverWebContents || serverWebContents.isDestroyed()) {
        console.warn(
          'Video call window: open-in-main-window could not find a target server webview for',
          serverUrl
        );
        return;
      }

      // Bring the main window to the foreground.
      const rootWindow = await getRootWindow();
      if (rootWindow && !rootWindow.isDestroyed()) {
        if (rootWindow.isMinimized()) {
          rootWindow.restore();
        }
        rootWindow.show();
        rootWindow.focus();
      }

      // Client-side route change. NOT a loadURL — that would hard-reload the
      // SPA. The web client listens for this event and calls its router.
      serverWebContents.send('navigate-to-route', path);
    }
  );

  handle('video-call-window/open-screen-picker', async (callerWebContents) => {
    if (!videoCallWindow || videoCallWindow.isDestroyed()) {
      console.warn(
        'Video call window: Cannot open screen picker - window not available'
      );
      return { success: false };
    }

    // Settle any foreign in-flight or queued request (e.g. a popout-originated
    // one sharing this tracker) and close its picker window before this
    // handler's own raw ipcMain.once below claims the response channel —
    // otherwise that request's callback never fires and its picker window is
    // never closed.
    videoCallScreenSharingTracker.cancelAll();

    videoCallWindow.webContents.send('video-call-window/open-screen-picker');

    // Forward the picker response back to the calling webContents (e.g. the Jitsi webview
    // preload that called ipcRenderer.invoke here). The screenSharePicker renderer sends
    // the result via ipcRenderer.send → ipcMain; we relay it to the caller so that
    // jitsiBridge's ipcRenderer.on listener fires correctly.
    ipcMain.once(
      'video-call-window/screen-sharing-source-responded',
      (_event, sourceId: string | null) => {
        if (!callerWebContents.isDestroyed()) {
          callerWebContents.send(
            'video-call-window/screen-sharing-source-responded',
            sourceId
          );
        }
      }
    );

    return { success: true };
  });

  handle('video-call-window/open-window', (_wc, url, options) => {
    const run = openWindowQueue.then(() =>
      openVideoCallWindow(_wc, url, options)
    );
    openWindowQueue = run.catch(() => {}); // keep chain alive on failure
    return run;
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

  clearDesktopCapturerCache();

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
    partition: pendingVideoCallPartition ?? undefined,
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

handle('video-call-window/get-credentials', async (callerWebContents) => {
  // Only return credentials to the video call window's webview
  const isAuthorizedCaller =
    !!videoCallWindow &&
    !videoCallWindow.isDestroyed() &&
    (callerWebContents.id === videoCallWindow.webContents.id ||
      callerWebContents.hostWebContents?.id === videoCallWindow.webContents.id);

  if (!isAuthorizedCaller || !videoCallCredentials) {
    return null;
  }

  return videoCallCredentials;
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
  prewarmDesktopCapturerCache();
  return { success: true };
});
