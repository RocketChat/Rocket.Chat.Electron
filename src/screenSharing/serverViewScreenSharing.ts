import type { WebContents } from 'electron';

import { handle } from '../ipc/main';
import { isProtocolAllowed } from '../navigation/main';
import { getRootWindow } from '../ui/main/rootWindow';
import { openExternal } from '../utils/browserLauncher';
import { ScreenSharingRequestTracker } from './ScreenSharingRequestTracker';
import { prewarmDesktopCapturerCache } from './desktopCapturerCache';
import type {
  DisplayMediaCallback,
  ScreenPickerProvider,
} from './screenPicker/types';
import { checkScreenRecordingPermission } from './screenRecordingPermission';

const serverViewTracker = new ScreenSharingRequestTracker(
  'screen-picker/source-responded',
  'Server view screen sharing'
);

const createRootWindowPickerHandler =
  (): ((callback: DisplayMediaCallback) => void) => (cb) => {
    prewarmDesktopCapturerCache();

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
      internalProvider.setHandleRequestHandler(createRootWindowPickerHandler());
      provider = internalProvider;
    }

    providerReady = true;
    console.log(`Server view screen sharing: using ${provider.type} provider`);
  })();

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
      prewarmDesktopCapturerCache();
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
