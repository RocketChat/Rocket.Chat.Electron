import type { WebContents, WebFrameMain } from 'electron';
import { BrowserWindow, webContents as electronWebContents } from 'electron';

import { handle } from '../ipc/main';
import { isProtocolAllowed } from '../navigation/main';
import { getRootWindow } from '../ui/main/rootWindow';
import { openExternal } from '../utils/browserLauncher';
import { ScreenSharingRequestTracker } from './ScreenSharingRequestTracker';
import { prewarmDesktopCapturerCache } from './desktopCapturerCache';
import { requestViaPickerWindow } from './popoutPickerRequest';
import type {
  DisplayMediaCallback,
  ScreenPickerProvider,
} from './screenPicker/types';
import { checkScreenRecordingPermission } from './screenRecordingPermission';

const serverViewTracker = new ScreenSharingRequestTracker(
  'screen-picker/source-responded',
  'Server view screen sharing'
);

const SERVER_VIEW_PICKER_CHANNELS = {
  response: 'screen-picker/source-responded',
  permission: 'screen-picker/screen-recording-is-permission-granted',
  openUrl: 'screen-picker/open-url',
};

/**
 * Resolves the standalone BrowserWindow that originated a display-media
 * request, or null if the request came from a webview guest (the main
 * server view) rather than a standalone window (e.g. a webapp popout).
 */
export const resolveStandaloneOriginWindow = (
  frame: WebFrameMain | null | undefined
): BrowserWindow | null => {
  if (!frame) return null;

  const origin = electronWebContents.fromFrame(frame);
  if (!origin) return null;

  if (origin.hostWebContents) return null;

  return BrowserWindow.fromWebContents(origin);
};

const createServerViewPickerHandler =
  (): ((
    callback: DisplayMediaCallback,
    originWindow?: BrowserWindow
  ) => void) =>
  (cb, originWindow) => {
    prewarmDesktopCapturerCache();

    if (originWindow && !originWindow.isDestroyed()) {
      requestViaPickerWindow(
        serverViewTracker,
        originWindow,
        SERVER_VIEW_PICKER_CHANNELS,
        cb
      );
      return;
    }

    serverViewTracker.createRequest(cb, () => {
      getRootWindow().then((rootWindow) => {
        if (rootWindow && !rootWindow.isDestroyed()) {
          rootWindow.webContents.send('screen-picker/open');
        } else {
          console.warn('Server view screen sharing: root window not available');
        }
      });
    });
  };

let provider: ScreenPickerProvider | null = null;
let providerReady = false;
let initPromise: Promise<void> | null = null;

const initializeProvider = (): Promise<void> => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { detectPickerType, InternalPickerProvider, PortalPickerProvider } =
      await import('./screenPicker');

    const pickerType = detectPickerType();

    if (pickerType === 'portal') {
      provider = new PortalPickerProvider();
    } else {
      const internalProvider = new InternalPickerProvider();
      internalProvider.setHandleRequestHandler(createServerViewPickerHandler());
      provider = internalProvider;
    }

    providerReady = true;
    console.log(`Server view screen sharing: using ${provider.type} provider`);
  })().catch((error) => {
    initPromise = null;
    providerReady = false;
    provider = null;
    throw error;
  });

  return initPromise;
};

export const setupServerViewDisplayMedia = (
  guestWebContents: WebContents
): void => {
  const setupHandler = (): void => {
    if (!provider || !providerReady) return;

    const currentProvider = provider;
    try {
      guestWebContents.session.setDisplayMediaRequestHandler(
        (request, cb) => {
          try {
            const originWindow = resolveStandaloneOriginWindow(request.frame);
            currentProvider.handleDisplayMediaRequest(
              cb,
              originWindow ?? undefined
            );
          } catch (error) {
            console.error(
              'Server view screen sharing: error in handler:',
              error
            );
            cb({ video: false } as any);
          }
        },
        { useSystemPicker: false }
      );
      if (currentProvider.requiresCacheWarming) {
        prewarmDesktopCapturerCache();
      }
    } catch (error) {
      console.error(
        'Server view screen sharing: error setting up handler:',
        error
      );
    }
  };

  if (providerReady) {
    setupHandler();
  } else {
    initializeProvider()
      .then(() => {
        if (!guestWebContents.isDestroyed()) {
          setupHandler();
        }
      })
      .catch((error) => {
        console.error(
          'Server view screen sharing: error initializing provider:',
          error
        );
      });
  }
};

/**
 * Routes a display-media request to the server-view screen picker (root window
 * by default, or `originWindow` when the request originated from a popout).
 * Used by the video call window's unified handler when it shares the server's
 * session and must dispatch a main-app request back to the server-view picker.
 */
export const handleServerViewDisplayMediaRequest = (
  callback: DisplayMediaCallback,
  originWindow?: BrowserWindow
): void => {
  const dispatch = (): void => {
    if (!provider) {
      callback({ video: false } as any);
      return;
    }
    try {
      provider.handleDisplayMediaRequest(callback, originWindow);
    } catch (error) {
      console.error('Server view screen sharing: error in handler:', error);
      callback({ video: false } as any);
    }
  };

  if (providerReady) {
    dispatch();
    return;
  }

  initializeProvider()
    .then(dispatch)
    .catch((error) => {
      console.error(
        'Server view screen sharing: error initializing provider:',
        error
      );
      callback({ video: false } as any);
    });
};

export const startServerViewScreenSharingHandler = (): void => {
  handle('screen-picker/screen-recording-is-permission-granted', async () =>
    checkScreenRecordingPermission()
  );

  handle('screen-picker/open-url', async (_webContents, url) => {
    const allowed = await isProtocolAllowed(url);
    if (!allowed) {
      return;
    }
    await openExternal(url);
  });
};
