/* eslint-disable import/order */
import path from 'path';
import crypto from 'crypto';

import { spawn } from 'child_process';
import * as fs from 'fs';

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
import { dispatch, listen, select } from '../../store';
import { readSetting } from '../../store/readSetting';
import {
  APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET,
  APP_MAIN_WINDOW_TITLE_SET,
  APP_PATH_SET,
  APP_VERSION_SET,
  APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET,
  APP_IS_SCREEN_LOCKED_SET,
} from '../actions';
import {
  SETTINGS_CLEAR_PERMITTED_SCREEN_CAPTURE_PERMISSIONS,
  SETTINGS_NTLM_CREDENTIALS_CHANGED,
  SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED,
  SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED,
  SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED,
  SETTINGS_SET_SCREEN_LOCK_PASSWORD_CHANGED,
  SETTINGS_SET_SCREEN_LOCK_PASSWORD_HASHED,
  MENU_BAR_LOCK_SCREEN_CLICKED,
} from '../../ui/actions';
import { askForClearScreenCapturePermission } from '../../ui/main/dialogs';
import { getRootWindow } from '../../ui/main/rootWindow';
import { preloadBrowsersList } from '../../utils';
import { getPersistedValues } from './persistence';
import type { ScreenLockPasswordStored } from '../PersistableValues';

export const packageJsonInformation = {
  productName: packageJson.productName,
  goUrlShortener: packageJson.goUrlShortener,
};

export const electronBuilderJsonInformation = {
  appId: electronBuilderJson.appId,
  protocol: electronBuilderJson.protocols.schemes[0],
};

// Throttling for lock attempts (in-memory only)
const MAX_LOCK_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const BACKOFF_BASE_MS = 500; // base backoff in ms

type LockAttemptRecord = {
  count: number;
  firstFailureTs: number;
  timeout?: NodeJS.Timeout | null;
};

// Keyed by webContents id (stringified) to limit attempts per sender
const lockAttemptMap: Map<string, LockAttemptRecord> = new Map();

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Secure password hashing utilities (use scrypt by default)
const PASSWORD_KDF = {
  algorithm: 'scrypt' as const,
  N: 16384, // cost
  r: 8,
  p: 1,
  keylen: 32,
  maxmem: 32 * 1024 * 1024, // 32MB
};

type StoredPasswordObject = {
  algorithm: string;
  hash: string; // base64
  salt: string; // base64
  params?: Record<string, any>;
};

const hashPlainPassword = (plain: string): Promise<StoredPasswordObject> =>
  new Promise((resolve, reject) => {
    try {
      const salt = crypto.randomBytes(16);
      crypto.scrypt(
        String(plain),
        salt,
        PASSWORD_KDF.keylen,
        {
          N: PASSWORD_KDF.N,
          r: PASSWORD_KDF.r,
          p: PASSWORD_KDF.p,
          maxmem: PASSWORD_KDF.maxmem,
        },
        (err, derived) => {
          if (err) return reject(err);
          resolve({
            algorithm: 'scrypt',
            hash: derived.toString('base64'),
            salt: salt.toString('base64'),
            params: {
              N: PASSWORD_KDF.N,
              r: PASSWORD_KDF.r,
              p: PASSWORD_KDF.p,
              keylen: PASSWORD_KDF.keylen,
            },
          });
        }
      );
    } catch (e) {
      reject(e);
    }
  });

const verifyPassword = (password: string, stored: any): Promise<boolean> =>
  new Promise((resolve) => {
    try {
      if (!stored) return resolve(false);

      // If stored is an object in new format
      if (typeof stored === 'object' && stored.algorithm) {
        if (stored.algorithm === 'scrypt') {
          const salt = Buffer.from(stored.salt, 'base64');
          const expected = Buffer.from(stored.hash, 'base64');
          const keylen = expected.length;
          const params = stored.params || {};
          const opts: any = {
            N: params.N ?? PASSWORD_KDF.N,
            r: params.r ?? PASSWORD_KDF.r,
            p: params.p ?? PASSWORD_KDF.p,
            maxmem: params.maxmem ?? PASSWORD_KDF.maxmem,
          };
          crypto.scrypt(
            String(password),
            salt,
            keylen,
            opts,
            (err, derived) => {
              if (err) {
                console.error(
                  'Error deriving key for password verification (scrypt):',
                  err
                );
                return resolve(false);
              }
              try {
                const match =
                  derived.length === expected.length &&
                  crypto.timingSafeEqual(derived, expected);
                return resolve(Boolean(match));
              } catch (e) {
                return resolve(false);
              }
            }
          );
          return;
        }

        // If it's marked as legacy-sha256, compare using sha256
        if (stored.algorithm === 'legacy-sha256') {
          try {
            const derived = Buffer.from(
              crypto
                .createHash('sha256')
                .update(String(password))
                .digest('hex'),
              'hex'
            );
            const expected = Buffer.from(stored.hash, 'base64');
            const match =
              derived.length === expected.length &&
              crypto.timingSafeEqual(derived, expected);
            return resolve(Boolean(match));
          } catch (e) {
            return resolve(false);
          }
        }

        // Unknown object algorithm
        return resolve(false);
      }

      // If stored is a string, support old pbkdf2$... format or legacy sha256 hex
      if (typeof stored === 'string') {
        // pbkdf2 encoded string format: pbkdf2$<digest>$i=<iterations>$s=<saltHex>$d=<derivedHex>
        const pbkdf2Match =
          /^pbkdf2\$(\w+)\$i=(\d+)\$s=([0-9a-f]+)\$d=([0-9a-f]+)$/.exec(stored);
        if (pbkdf2Match) {
          const [, digest, itStr, saltHex, expectedHex] = pbkdf2Match;
          const iterations = Number(itStr);
          const salt = Buffer.from(saltHex, 'hex');
          const expected = Buffer.from(expectedHex, 'hex');
          crypto.pbkdf2(
            String(password),
            salt,
            iterations,
            expected.length,
            digest,
            (err, derived) => {
              if (err) {
                console.error(
                  'Error deriving key for password verification (pbkdf2):',
                  err
                );
                return resolve(false);
              }
              try {
                const match =
                  derived.length === expected.length &&
                  crypto.timingSafeEqual(derived, expected);
                resolve(Boolean(match));
              } catch (e) {
                resolve(false);
              }
            }
          );
          return;
        }

        // legacy unsalted sha256 hex
        if (/^[0-9a-f]{64}$/.test(stored)) {
          try {
            const derived = Buffer.from(
              crypto
                .createHash('sha256')
                .update(String(password))
                .digest('hex'),
              'hex'
            );
            const expected = Buffer.from(stored, 'hex');
            const match =
              derived.length === expected.length &&
              crypto.timingSafeEqual(derived, expected);
            return resolve(Boolean(match));
          } catch (e) {
            return resolve(false);
          }
        }
      }

      return resolve(false);
    } catch (e) {
      console.error('Error verifying password:', e);
      resolve(false);
    }
  });

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

export const showLockWindow = async (): Promise<void> => {
  try {
    // Prefer current in-memory state; fall back to persisted store
    const liveHash = select((s) => s.screenLockPasswordHash);
    const persisted = getPersistedValues();
    const effectiveHash = liveHash ?? persisted?.screenLockPasswordHash;
    if (!effectiveHash) {
      console.log('No screen lock password configured; skipping lock overlay');
      return;
    }

    const rootWindow = await getRootWindow();

    if (lockWindow && !lockWindow.webContents.isDestroyed()) {
      return;
    }

    // Mark app as locked (persisted)
    dispatch({ type: APP_IS_SCREEN_LOCKED_SET, payload: true });

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
        // so we can safely expose a minimal API via preload.
        nodeIntegration: false,
        contextIsolation: true,
        // Use the built preload script placed into the `app/` folder during build
        preload: path.join(app.getAppPath(), 'app/lockPreload.js'),
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
          rootWindow.setResizable(Boolean(lockState.prevResizable));
        }
        if (typeof lockState.prevMinimizable === 'boolean') {
          rootWindow.setMinimizable(Boolean(lockState.prevMinimizable));
        }
        if (typeof lockState.prevMaximizable === 'boolean') {
          rootWindow.setMaximizable(Boolean(lockState.prevMaximizable));
        }
        // use optional chaining for prevMovable where possible
        if (
          typeof (rootWindow as any).setMovable === 'function' &&
          (lockState as any)?.prevMovable !== undefined
        ) {
          (rootWindow as any).setMovable(
            Boolean((lockState as any).prevMovable)
          );
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

  ipcMain.handle('lock:verify', async (event, password: string) => {
    try {
      // Only allow verification from the lock overlay BrowserView itself
      if (!lockWindow || event.sender !== lockWindow.webContents) {
        return false;
      }

      // Identify caller by webContents id when possible
      const senderId = (event as any)?.sender?.id
        ? String((event as any).sender.id)
        : 'unknown';

      const now = Date.now();
      const record = lockAttemptMap.get(senderId);

      // If exceeded max attempts within lockout window, reject immediately
      if (record && record.count >= MAX_LOCK_ATTEMPTS) {
        const elapsed = now - record.firstFailureTs;
        if (elapsed < LOCKOUT_WINDOW_MS) {
          return false;
        }
      }

      // Prefer current in-memory state to avoid races with disk persistence
      const liveHash = select((s) => s.screenLockPasswordHash);
      const persisted = liveHash ? null : getPersistedValues();
      const storedHash = liveHash ?? persisted?.screenLockPasswordHash ?? null;

      if (!storedHash) {
        return false;
      }

      const success = await verifyPassword(password, storedHash);

      if (success) {
        // Reset any attempt record on success
        const existing = lockAttemptMap.get(senderId);
        if (existing) {
          if (existing.timeout) {
            clearTimeout(existing.timeout);
          }
          lockAttemptMap.delete(senderId);
        }
        return true;
      }

      // Failure: update attempt record
      const prev = lockAttemptMap.get(senderId);
      let newCount = 1;
      let firstFailureTs = now;
      if (prev) {
        newCount = prev.count + 1;
        firstFailureTs = prev.firstFailureTs || now;
        if (prev.timeout) {
          clearTimeout(prev.timeout);
        }
      }

      // Schedule record removal after LOCKOUT_WINDOW_MS to avoid unbounded growth
      const timeout = setTimeout(() => {
        lockAttemptMap.delete(senderId);
      }, LOCKOUT_WINDOW_MS);

      lockAttemptMap.set(senderId, {
        count: newCount,
        firstFailureTs,
        timeout,
      });

      // Apply exponential backoff before returning false to slow brute-force
      const backoffMs = Math.min(
        BACKOFF_BASE_MS * 2 ** Math.max(0, newCount - 1),
        30_000
      );
      await sleep(backoffMs);

      return false;
    } catch (error) {
      console.error('Error verifying lock password:', error);
      return false;
    }
  });

  // Re-add: unlock handler, only from lock overlay
  ipcMain.handle('lock:unlock', async (event) => {
    try {
      if (!lockWindow || event.sender !== lockWindow.webContents) {
        return false;
      }

      if (lockWindow && !lockWindow.webContents.isDestroyed()) {
        try {
          const rootWindow = await getRootWindow();
          rootWindow.removeBrowserView(lockWindow);
        } catch (e) {
          // ignore
        }
        try {
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
      dispatch({ type: APP_IS_SCREEN_LOCKED_SET, payload: false });
      return true;
    } catch (error) {
      console.error('Error unlocking app:', error);
      return false;
    }
  });

  // Directly set (or clear) the lock password securely from renderer
  ipcMain.handle('lock:set', async (event, password: string) => {
    try {
      // Allow only from lock overlay OR the main root window (Settings UI)
      const rootWindow = await getRootWindow().catch(() => null as any);
      const rootWc = rootWindow?.webContents ?? null;
      const isFromLock = lockWindow && event.sender === lockWindow.webContents;
      const isFromRoot = rootWc && event.sender === rootWc;
      if (!isFromLock && !isFromRoot) {
        const err: any = new Error('unauthorized');
        err.code = 'ERR_UNAUTHORIZED';
        throw err;
      }

      const plain = password || '';
      if (!plain) {
        dispatch({
          type: SETTINGS_SET_SCREEN_LOCK_PASSWORD_HASHED,
          payload: null,
        });
        return null;
      }

      const encoded = await hashPlainPassword(String(plain));
      const stored = encoded as unknown as ScreenLockPasswordStored;
      dispatch({
        type: SETTINGS_SET_SCREEN_LOCK_PASSWORD_HASHED,
        payload: stored,
      });
      return stored;
    } catch (error) {
      console.error('Error setting lock password:', error);
      throw error instanceof Error ? error : new Error('lock-set-failed');
    }
  });
};

export const relaunchApp = (...args: string[]): void => {
  // For AppImage, use spawn to relaunch because app.relaunch() doesn't work reliably
  if (process.env.APPIMAGE) {
    console.log('Relaunching AppImage:', {
      appImage: process.env.APPIMAGE,
      args,
    });

    // Spawn the AppImage as a detached process
    spawn(process.env.APPIMAGE, args, {
      detached: true,
      stdio: 'ignore',
    }).unref();

    app.exit();
    return;
  }

  // For non-AppImage, use the standard relaunch method
  const command = process.argv.slice(1, app.isPackaged ? 1 : 2);
  app.relaunch({ args: [...command, ...args] });
  app.exit();
};

export const performElectronStartup = (): void => {
  app.setAsDefaultProtocolClient(electronBuilderJsonInformation.protocol);
  app.setAppUserModelId(electronBuilderJsonInformation.appId);

  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

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
    app.commandLine.appendSwitch('disable-2d-canvas-image-chromium');
    app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
    app.commandLine.appendSwitch('disable-gpu');
  }

  if (process.platform === 'win32') {
    const sessionName = process.env.SESSIONNAME;
    const isRdpSession = Boolean(sessionName && sessionName !== 'Console');

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
      disabledChromiumFeatures.push('WebRtcAllowWgcScreenCapturer');
    }
  }

  // Apply all disabled features in a single call
  app.commandLine.appendSwitch(
    'disable-features',
    disabledChromiumFeatures.join(',')
  );

  // Enable PipeWire screen capture for Linux (Wayland support)
  if (process.platform === 'linux') {
    app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');

    // Detect display server and force X11 if not in Wayland session
    // This must happen BEFORE Electron tries to auto-select platform
    // to prevent segfaults when Wayland is attempted but unavailable
    const hasOzonePlatformOverride =
      args.some((arg) => arg.startsWith('--ozone-platform=')) ||
      (process.env.ELECTRON_OZONE_PLATFORM_HINT?.trim() || '') !== '';

    if (!hasOzonePlatformOverride) {
      const sessionType = process.env.XDG_SESSION_TYPE;
      const waylandDisplay = process.env.WAYLAND_DISPLAY;

      // Normalize values: trim whitespace and handle empty strings
      const normalizedSessionType = sessionType?.trim() || '';
      const normalizedWaylandDisplay = waylandDisplay?.trim() || '';

      // Only use Wayland if we're actually in a Wayland session AND have a valid socket
      // This covers all edge cases:
      // - X11 sessions (sessionType === 'x11' or unset) → force X11
      // - Invalid session types (tty, mir, etc.) → force X11
      // - Wayland session but no display → force X11
      // - Wayland session but socket doesn't exist → force X11
      const checkWaylandSocket = (): boolean => {
        if (
          normalizedSessionType !== 'wayland' ||
          normalizedWaylandDisplay === ''
        ) {
          return false;
        }
        try {
          const runtimeDir =
            process.env.XDG_RUNTIME_DIR ||
            `/run/user/${process.getuid?.() ?? 1000}`;
          const socketPath = `${runtimeDir}/${normalizedWaylandDisplay}`;
          const stats = fs.statSync(socketPath);
          return stats.isSocket();
        } catch {
          return false;
        }
      };
      const isWaylandSession = checkWaylandSocket();

      if (isWaylandSession) {
        console.log(
          'Using Wayland platform',
          JSON.stringify({
            sessionType: normalizedSessionType,
            waylandDisplay: normalizedWaylandDisplay,
          })
        );
        // Let Electron use Wayland (default auto behavior)
        // Don't set ozone-platform, let Electron auto-detect
      } else {
        let reason: string;
        if (
          normalizedSessionType === 'wayland' &&
          normalizedWaylandDisplay !== ''
        ) {
          reason = 'socket-not-found';
        } else if (normalizedSessionType === 'wayland') {
          reason = 'no-wayland-display';
        } else if (normalizedSessionType === 'x11') {
          reason = 'x11-session';
        } else if (normalizedSessionType === '') {
          reason = 'no-session-type';
        } else {
          reason = 'invalid-session-type';
        }

        console.log(
          'Forcing X11 platform',
          JSON.stringify({
            sessionType: normalizedSessionType || 'unset',
            waylandDisplay: normalizedWaylandDisplay || 'unset',
            reason,
          })
        );
        app.commandLine.appendSwitch('ozone-platform', 'x11');
      }
    }
  }
};

export const initializeScreenCaptureFallbackState = (): void => {
  dispatch({
    type: APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET,
    payload: isScreenCaptureFallbackForced,
  });
};

export const markMainWindowStable = (): void => {
  // No-op: kept for API compatibility
};

export const setupGpuCrashHandler = (): void => {
  if (process.platform !== 'linux') {
    return;
  }

  const args = process.argv.slice(app.isPackaged ? 1 : 2);
  if (args.includes('--disable-gpu')) {
    return;
  }

  // Handle GPU process crashes (runtime failures)
  app.on('child-process-gone', (_event, details) => {
    if (details.type !== 'GPU') {
      return;
    }

    console.log('GPU process crashed, disabling GPU and relaunching with X11');
    const userArgs = process.argv.slice(app.isPackaged ? 1 : 2);
    relaunchApp('--disable-gpu', '--ozone-platform=x11', ...userArgs);
  });

  // Proactive GPU detection: check GPU status once info is available
  app.once('gpu-info-update', () => {
    const gpuFeatures = app.getGPUFeatureStatus();
    const { gpu_compositing: gpuCompositing, webgl } = gpuFeatures;

    // Check if key GPU features are disabled/unavailable (includes _software variants)
    const isGpuBroken = (status: string | undefined): boolean =>
      !status ||
      status.startsWith('disabled') ||
      status.startsWith('unavailable');

    if (isGpuBroken(gpuCompositing) || isGpuBroken(webgl)) {
      console.log(
        'GPU features unavailable, disabling GPU and relaunching with X11',
        JSON.stringify(gpuFeatures)
      );
      const userArgs = process.argv.slice(app.isPackaged ? 1 : 2);
      relaunchApp('--disable-gpu', '--ozone-platform=x11', ...userArgs);
      return;
    }

    console.log('GPU features status:', JSON.stringify(gpuFeatures));
  });
};

export const setupApp = (): void => {
  app.addListener('activate', async () => {
    try {
      const browserWindow = await getRootWindow();
      if (!browserWindow.isVisible()) {
        const wasMinimized = browserWindow.isMinimized();
        const wasMaximized = browserWindow.isMaximized();
        browserWindow.showInactive();
        if (wasMinimized) browserWindow.minimize();
        if (wasMaximized) browserWindow.maximize();
      }
      browserWindow.focus();
    } catch (error) {
      console.warn('Could not activate window:', error);
    }
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

  // We are called after app.whenReady() in main.ts, so register immediately to avoid races
  preloadBrowsersList();
  registerLockIpcHandlers();

  listen(SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED, () => {
    relaunchApp();
  });

  listen(SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED, () => {
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
      const isRdpSession = Boolean(sessionName && sessionName !== 'Console');

      if (newSettingValue !== currentPersistedSetting && !isRdpSession) {
        relaunchApp();
      } else if (isRdpSession) {
        console.log(
          'Screen Capture Fallback setting changed in RDP session. Change will apply when running locally. No restart needed now since WGC is already disabled by RDP detection.'
        );
      }
    }
  );

  // Hash and persist screen lock password when renderer sends plaintext
  listen(SETTINGS_SET_SCREEN_LOCK_PASSWORD_CHANGED, async (action) => {
    try {
      const plain = action.payload || '';
      if (!plain) {
        dispatch({
          type: SETTINGS_SET_SCREEN_LOCK_PASSWORD_HASHED,
          payload: null,
        });
        return;
      }

      const encoded = await hashPlainPassword(String(plain));
      dispatch({
        type: SETTINGS_SET_SCREEN_LOCK_PASSWORD_HASHED,
        payload: encoded as unknown as ScreenLockPasswordStored,
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
