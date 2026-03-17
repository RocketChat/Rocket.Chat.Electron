import type { Event, WebContents } from 'electron';
import { desktopCapturer, ipcMain, systemPreferences } from 'electron';

import { handle } from '../ipc/main';
import { isProtocolAllowed } from '../navigation/main';
import { getRootWindow } from '../ui/main/rootWindow';
import { openExternal } from '../utils/browserLauncher';
import type {
  DisplayMediaCallback,
  ScreenPickerProvider,
} from '../videoCallWindow/screenPicker/types';

const SCREEN_SHARING_REQUEST_TIMEOUT = 60000;

let activeScreenSharingListener:
  | ((event: Event, sourceId: string | null) => void)
  | null = null;
let activeScreenSharingRequestId: string | null = null;
let screenSharingTimeout: NodeJS.Timeout | null = null;
let isScreenSharingRequestPending = false;

const cleanupScreenSharingListener = (): void => {
  if (activeScreenSharingListener) {
    ipcMain.removeListener(
      'screen-picker/source-responded',
      activeScreenSharingListener
    );
    activeScreenSharingListener = null;
  }

  if (screenSharingTimeout) {
    clearTimeout(screenSharingTimeout);
    screenSharingTimeout = null;
  }

  activeScreenSharingRequestId = null;
  isScreenSharingRequestPending = false;
};

const removeScreenSharingListenerOnly = (): void => {
  if (activeScreenSharingListener) {
    ipcMain.removeListener(
      'screen-picker/source-responded',
      activeScreenSharingListener
    );
    activeScreenSharingListener = null;
  }
};

const markScreenSharingComplete = (): void => {
  if (screenSharingTimeout) {
    clearTimeout(screenSharingTimeout);
    screenSharingTimeout = null;
  }
  activeScreenSharingRequestId = null;
  isScreenSharingRequestPending = false;
};

const createRootWindowPickerHandler =
  (): ((callback: DisplayMediaCallback) => void) =>
  (cb: DisplayMediaCallback) => {
    if (isScreenSharingRequestPending) {
      console.warn(
        'Server view screen sharing: request already pending, ignoring'
      );
      cb({ video: false } as any);
      return;
    }

    cleanupScreenSharingListener();

    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    activeScreenSharingRequestId = requestId;
    isScreenSharingRequestPending = true;

    let callbackInvoked = false;

    const listener = async (_event: Event, sourceId: string | null) => {
      if (activeScreenSharingRequestId !== requestId) {
        return;
      }

      if (callbackInvoked) {
        return;
      }
      callbackInvoked = true;

      removeScreenSharingListenerOnly();
      markScreenSharingComplete();

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
            'Server view screen sharing: selected source no longer available:',
            sourceId
          );
          cb({ video: false } as any);
          return;
        }

        cb({ video: selectedSource });
      } catch (error) {
        console.error(
          'Server view screen sharing: error validating source:',
          error
        );
        cb({ video: false } as any);
      }
    };

    activeScreenSharingListener = listener;

    screenSharingTimeout = setTimeout(() => {
      if (activeScreenSharingRequestId !== requestId) {
        return;
      }
      if (callbackInvoked) {
        return;
      }
      callbackInvoked = true;

      console.warn(
        'Server view screen sharing: request timed out, cleaning up'
      );
      removeScreenSharingListenerOnly();
      markScreenSharingComplete();
      cb({ video: false } as any);
    }, SCREEN_SHARING_REQUEST_TIMEOUT);

    ipcMain.once('screen-picker/source-responded', listener);

    getRootWindow().then((rootWindow) => {
      if (rootWindow && !rootWindow.isDestroyed()) {
        rootWindow.webContents.send('screen-picker/open');
      } else {
        console.warn('Server view screen sharing: root window not available');
        if (!callbackInvoked) {
          callbackInvoked = true;
          removeScreenSharingListenerOnly();
          markScreenSharingComplete();
          cb({ video: false } as any);
        }
      }
    });
  };

let provider: ScreenPickerProvider | null = null;
let providerReady = false;

const initializeProvider = async (): Promise<void> => {
  const { detectPickerType, InternalPickerProvider, PortalPickerProvider } =
    await import('../videoCallWindow/screenPicker');

  const pickerType = detectPickerType();

  if (pickerType === 'portal') {
    provider = new PortalPickerProvider();
  } else {
    const internalProvider = new InternalPickerProvider();
    internalProvider.setHandleRequestHandler(createRootWindowPickerHandler());
    provider = internalProvider;
  }

  providerReady = true;
  console.log(`Server view screen sharing: using ${provider.type} provider`);
};

export const setupServerViewDisplayMedia = (
  guestWebContents: WebContents
): void => {
  const setupHandler = (): void => {
    if (!provider || !providerReady) return;

    const currentProvider = provider;
    try {
      guestWebContents.session.setDisplayMediaRequestHandler(
        (_request, cb) => {
          try {
            currentProvider.handleDisplayMediaRequest(cb);
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

export const startServerViewScreenSharingHandler = (): void => {
  handle('screen-picker/screen-recording-is-permission-granted', async () => {
    if (process.platform === 'darwin') {
      const permission = systemPreferences.getMediaAccessStatus('screen');
      return permission === 'granted';
    }
    return true;
  });

  handle('screen-picker/open-url', async (_webContents, url) => {
    const allowed = await isProtocolAllowed(url);
    if (!allowed) {
      return;
    }
    await openExternal(url);
  });
};
