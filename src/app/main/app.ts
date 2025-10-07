/* eslint-disable import/order */
import path from 'path';
import crypto from 'crypto';

import { rimraf } from 'rimraf';
import { app, session, BrowserWindow, ipcMain, BrowserView } from 'electron';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore:next-line
// eslint-disable-next-line import/order, @typescript-eslint/no-unused-vars
import electronBuilderJson from '../../../electron-builder.json';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore:next-line
// eslint-disable-next-line import/order, @typescript-eslint/no-unused-vars
import packageJson from '../../../package.json';
import { JITSI_SERVER_CAPTURE_SCREEN_PERMISSIONS_CLEARED } from '../../jitsi/actions';
import { dispatch, listen } from '../../store';
import { readSetting } from '../../store/readSetting';
import {
  APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET,
  APP_MAIN_WINDOW_TITLE_SET,
  APP_PATH_SET,
  APP_VERSION_SET,
  APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET,
} from '../actions';
import {
  SETTINGS_CLEAR_PERMITTED_SCREEN_CAPTURE_PERMISSIONS,
  SETTINGS_NTLM_CREDENTIALS_CHANGED,
  SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED,
  SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED,
  SETTINGS_SET_SCREEN_LOCK_PASSWORD_CHANGED,
  SETTINGS_SET_SCREEN_LOCK_PASSWORD_HASHED,
  MENU_BAR_LOCK_SCREEN_CLICKED,
} from '../../ui/actions';
import { askForClearScreenCapturePermission } from '../../ui/main/dialogs';
import { getRootWindow } from '../../ui/main/rootWindow';
import { preloadBrowsersList } from '../../utils/browserLauncher';
import { getPersistedValues } from './persistence';

export const packageJsonInformation = {
  productName: packageJson.productName,
  goUrlShortener: packageJson.goUrlShortener,
};

export const electronBuilderJsonInformation = {
  appId: electronBuilderJson.appId,
  protocol: electronBuilderJson.protocols.schemes[0],
};

export const getPlatformName = (): string => {
  switch (process.platform) {
    case 'win32':
      return 'Windows';
    case 'linux':
      return 'Linux';
    case 'darwin':
      return 'macOS';
    default:
      return 'Unknown';
  }
};

let isScreenCaptureFallbackForced = false;

let lockWindow: BrowserView | null = null;

// Track original rootWindow state while locked so we can restore it on unlock
const lockState: {
  originalBounds?: Electron.Rectangle;
  prevResizable?: boolean;
  prevMinimizable?: boolean;
  prevMaximizable?: boolean;
  moveListener?: () => void;
  resizeListener?: () => void;
} = {};

const showLockWindow = async (): Promise<void> => {
  try {
    const persisted = getPersistedValues();
    if (!persisted?.screenLockPasswordHash) {
      console.log('No screen lock password configured; skipping lock overlay');
      return;
    }

    const rootWindow = await getRootWindow();

    if (lockWindow && !lockWindow.webContents.isDestroyed()) {
      return;
    }

    // Save current window flags and bounds so we can restore them
    try {
      lockState.originalBounds = rootWindow.getBounds();
      lockState.prevResizable = rootWindow.isResizable();
      lockState.prevMinimizable = rootWindow.isMinimizable();
      lockState.prevMaximizable = rootWindow.isMaximizable();
      // Capture movability if available on the platform
      try {
        if (typeof (rootWindow as any).isMovable === 'function') {
          (lockState as any).prevMovable = (rootWindow as any).isMovable();
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // if anything fails while saving/enforcing, continue — locking view still provides protection over content
    }

    // Create a BrowserView and attach it to the root window so the lock screen
    // appears inside the application window (not above other apps) and covers
    // the entire content area.
    lockWindow = new BrowserView({
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    rootWindow.setBrowserView(lockWindow);

    const updateBounds = () => {
      try {
        const { width, height } = rootWindow.getContentBounds();
        lockWindow?.setBounds({ x: 0, y: 0, width, height });
      } catch (e) {
        /* ignore errors while updating bounds */
      }
    };

    // ensure the view resizes with the window
    lockWindow.setAutoResize({ width: true, height: true });
    updateBounds();

    // keep bounds updated on move/resize
    rootWindow.addListener('resize', updateBounds);
    rootWindow.addListener('move', updateBounds);

    lockWindow.webContents.loadFile(
      path.join(app.getAppPath(), 'app/lockScreen.html')
    );

    lockWindow.webContents.once('did-finish-load', async () => {
      try {
        await lockWindow?.webContents.executeJavaScript(`
          window.electronAPI = {
            verifyPassword: (password) => require('electron').ipcRenderer.invoke('lock:verify', password),
            unlockApp: () => require('electron').ipcRenderer.invoke('lock:unlock')
          };
          null;
        `);
      } catch (e) {
        console.warn('Failed to inject electronAPI into lock view', e);
      }

      lockWindow?.webContents.focus();
    });

    // cleanup when view is destroyed
    lockWindow.webContents.once('destroyed', () => {
      try {
        rootWindow.removeBrowserView(lockWindow as BrowserView);
      } catch (e) {
        // ignore
      }
      lockWindow = null;

      // restore window flags and remove listeners
      try {
        if (lockState.moveListener) {
          rootWindow.removeListener('move', lockState.moveListener);
        }
        if (lockState.resizeListener) {
          rootWindow.removeListener('resize', lockState.resizeListener);
        }

        // remove the updateBounds listeners we added earlier
        rootWindow.removeListener('resize', updateBounds);
        rootWindow.removeListener('move', updateBounds);

        if (typeof lockState.prevResizable === 'boolean') {
          rootWindow.setResizable(!!lockState.prevResizable);
        }
        if (typeof lockState.prevMinimizable === 'boolean') {
          rootWindow.setMinimizable(!!lockState.prevMinimizable);
        }
        if (typeof lockState.prevMaximizable === 'boolean') {
          rootWindow.setMaximizable(!!lockState.prevMaximizable);
        }
        if (
          typeof rootWindow.setMovable === 'function' &&
          typeof (lockState as any).prevMovable !== 'undefined'
        ) {
          rootWindow.setMovable(!!(lockState as any).prevMovable);
        }
      } catch (e) {
        // ignore
      }

      // clear stored state
      lockState.originalBounds = undefined;
      lockState.prevResizable = undefined;
      lockState.prevMinimizable = undefined;
      lockState.prevMaximizable = undefined;
      lockState.moveListener = undefined;
      lockState.resizeListener = undefined;
    });
  } catch (error) {
    console.error('Error showing lock window:', error);
  }
};

// Register lock-related IPC handlers. This is called from `setupApp` after Electron is ready
export const registerLockIpcHandlers = (): void => {
  if (!ipcMain || typeof ipcMain.handle !== 'function') {
    // eslint-disable-next-line no-console
    console.warn(
      'ipcMain is not available; lock IPC handlers will not be registered.'
    );
    return;
  }

  ipcMain.handle('lock:verify', async (_event, password: string) => {
    try {
      const persisted = getPersistedValues();
      const storedHash = persisted?.screenLockPasswordHash ?? null;
      if (!storedHash) {
        return false;
      }

      const hash = crypto
        .createHash('sha256')
        .update(String(password))
        .digest('hex');

      return hash === storedHash;
    } catch (error) {
      console.error('Error verifying lock password:', error);
      return false;
    }
  });

  ipcMain.handle('lock:unlock', async () => {
    try {
      if (lockWindow && !lockWindow.webContents.isDestroyed()) {
        try {
          const rootWindow = await getRootWindow();
          rootWindow.removeBrowserView(lockWindow);
        } catch (e) {
          // ignore
        }
        try {
          // WebContents.destroy may not be in the TypeScript definitions, cast to any
          (lockWindow.webContents as any).destroy?.();
        } catch (e) {
          // ignore
        }
        lockWindow = null;
      }
      const rootWindow = await getRootWindow();
      if (rootWindow && !rootWindow.isDestroyed()) {
        rootWindow.show();
        rootWindow.focus();
      }
      return true;
    } catch (error) {
      console.error('Error unlocking app:', error);
      return false;
    }
  });
};

export const relaunchApp = (...args: string[]): void => {
  const command = process.argv.slice(1, app.isPackaged ? 1 : 2);
  app.relaunch({ args: [...command, ...args] });
  app.exit();
};

export const performElectronStartup = (): void => {
  app.setAsDefaultProtocolClient(electronBuilderJsonInformation.protocol);
  app.setAppUserModelId(electronBuilderJsonInformation.appId);

  app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

  const disabledChromiumFeatures = [
    'HardwareMediaKeyHandling',
    'MediaSessionService',
  ];

  if (getPlatformName() === 'macOS' && process.mas) {
    app.commandLine.appendSwitch('disable-accelerated-video-decode');
  }

  const args = process.argv.slice(app.isPackaged ? 1 : 2);

  if (args.includes('--reset-app-data')) {
    rimraf.sync(app.getPath('userData'));
    relaunchApp();
    return;
  }

  const canStart = process.mas || app.requestSingleInstanceLock();

  if (!canStart) {
    app.exit();
    return;
  }

  const isHardwareAccelerationEnabled = readSetting(
    'isHardwareAccelerationEnabled'
  );
  const isScreenCaptureFallbackEnabled = readSetting(
    'isVideoCallScreenCaptureFallbackEnabled'
  );

  isScreenCaptureFallbackForced = false;

  if (
    args.includes('--disable-gpu') ||
    isHardwareAccelerationEnabled === false
  ) {
    console.log('Disabling Hardware acceleration');
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('--disable-2d-canvas-image-chromium');
    app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
    app.commandLine.appendSwitch('--disable-gpu');
  }

  if (process.platform === 'win32') {
    const sessionName = process.env.SESSIONNAME;
    const isRdpSession =
      typeof sessionName === 'string' && sessionName !== 'Console';

    isScreenCaptureFallbackForced = isRdpSession;

    if (isScreenCaptureFallbackEnabled || isRdpSession) {
      console.log(
        'Disabling Windows Graphics Capture for video calls',
        JSON.stringify({
          reason: isScreenCaptureFallbackEnabled
            ? 'user-setting'
            : 'rdp-session',
          sessionName,
        })
      );
      disabledChromiumFeatures.push('WebRtcAllowWgcDesktopCapturer');
    }
  }

  // Apply all disabled features in a single call
  app.commandLine.appendSwitch(
    'disable-features',
    disabledChromiumFeatures.join(',')
  );
};

export const initializeScreenCaptureFallbackState = (): void => {
  dispatch({
    type: APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET,
    payload: isScreenCaptureFallbackForced,
  });
};

export const setupApp = (): void => {
  app.addListener('activate', async () => {
    const browserWindow = await getRootWindow();
    if (!browserWindow.isVisible()) {
      browserWindow.showInactive();
    }
    browserWindow.focus();
  });

  app.addListener('window-all-closed', () => {
    // Don't quit immediately if this might be caused by video call window closure
    // especially during first launch when main window might not be fully ready
    setTimeout(() => {
      const allWindows = BrowserWindow.getAllWindows();

      // Only quit if there are truly no windows left after a brief delay
      // This prevents crashes when video call window closes before main window is established
      if (allWindows.length === 0) {
        console.log('No windows remaining after delay, quitting application');
        app.quit();
      } else {
        console.log(`${allWindows.length} window(s) still exist, not quitting`);
      }
    }, 100); // Brief delay to let window state stabilize
  });

  // Register IPC handlers and other readiness tasks once Electron is ready
  app.whenReady().then(() => {
    preloadBrowsersList();
    registerLockIpcHandlers();
  });

  listen(SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED, () => {
    relaunchApp();
  });

  listen(
    SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED,
    (action) => {
      const newSettingValue = action.payload;
      const currentPersistedSetting = readSetting(
        'isVideoCallScreenCaptureFallbackEnabled'
      );
      const sessionName = process.env.SESSIONNAME;
      const isRdpSession =
        typeof sessionName === 'string' && sessionName !== 'Console';

      // Relaunch only if the setting actually changes AND it's not already forced by RDP
      if (newSettingValue !== currentPersistedSetting && !isRdpSession) {
        relaunchApp();
      } else if (isRdpSession) {
        console.log(
          'Screen Capture Fallback setting changed, but app is in RDP session. Skipping relaunch.'
        );
      }
    }
  );

  // Hash and persist screen lock password when renderer sends plaintext
  listen(SETTINGS_SET_SCREEN_LOCK_PASSWORD_CHANGED, (action) => {
    try {
      const plain = action.payload || '';
      const hash = plain
        ? crypto.createHash('sha256').update(String(plain)).digest('hex')
        : null;
      dispatch({
        type: SETTINGS_SET_SCREEN_LOCK_PASSWORD_HASHED,
        payload: hash,
      });
    } catch (error) {
      console.error('Error hashing screen lock password:', error);
    }
  });

  // Show lock overlay when menu item clicked
  listen(MENU_BAR_LOCK_SCREEN_CLICKED, async () => {
    await showLockWindow();
  });

  listen(APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET, (action) => {
    if (action.payload.length > 0) {
      session.defaultSession.allowNTLMCredentialsForDomains(action.payload);
    }
  });

  listen(SETTINGS_NTLM_CREDENTIALS_CHANGED, (action) => {
    if (action.payload === true) {
      const allowedNTLMCredentialsDomains = readSetting(
        'allowedNTLMCredentialsDomains'
      );
      if (allowedNTLMCredentialsDomains) {
        console.log('Setting NTLM credentials', allowedNTLMCredentialsDomains);
        session.defaultSession.allowNTLMCredentialsForDomains(
          allowedNTLMCredentialsDomains
        );
      }
    } else {
      console.log('Clearing NTLM credentials');
      session.defaultSession.allowNTLMCredentialsForDomains('');
    }
  });

  listen(SETTINGS_CLEAR_PERMITTED_SCREEN_CAPTURE_PERMISSIONS, async () => {
    const permitted = await askForClearScreenCapturePermission();
    if (permitted) {
      dispatch({
        type: JITSI_SERVER_CAPTURE_SCREEN_PERMISSIONS_CLEARED,
        payload: {},
      });
    }
  });

  const allowedNTLMCredentialsDomains = readSetting(
    'allowedNTLMCredentialsDomains'
  );

  const isNTLMCredentialsEnabled = readSetting('isNTLMCredentialsEnabled');

  if (isNTLMCredentialsEnabled && allowedNTLMCredentialsDomains.length > 0) {
    console.log('Setting NTLM credentials', allowedNTLMCredentialsDomains);
    session.defaultSession.allowNTLMCredentialsForDomains(
      allowedNTLMCredentialsDomains
    );
  }

  dispatch({ type: APP_PATH_SET, payload: app.getAppPath() });
  dispatch({ type: APP_VERSION_SET, payload: app.getVersion() });
  dispatch({ type: APP_MAIN_WINDOW_TITLE_SET, payload: 'Rocket.Chat' });
};
