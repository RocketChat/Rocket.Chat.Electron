import { spawn } from 'child_process';
import * as fs from 'fs';

import { app, session, BrowserWindow } from 'electron';
import { rimraf } from 'rimraf';

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
  SETTINGS_CLEAR_PERMITTED_SCREEN_CAPTURE_PERMISSIONS,
  SETTINGS_NTLM_CREDENTIALS_CHANGED,
  SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED,
  SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED,
  SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED,
} from '../../ui/actions';
import { askForClearScreenCapturePermission } from '../../ui/main/dialogs';
import { getRootWindow } from '../../ui/main/rootWindow';
import { preloadBrowsersList } from '../../utils/browserLauncher';
import {
  APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET,
  APP_MAIN_WINDOW_TITLE_SET,
  APP_PATH_SET,
  APP_VERSION_SET,
  APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET,
} from '../actions';

export const packageJsonInformation = {
  productName: packageJson.productName,
  goUrlShortener: packageJson.goUrlShortener,
};

export const electronBuilderJsonInformation = {
  appId: electronBuilderJson.appId,
  protocol: electronBuilderJson.protocols.schemes[0],
};

let isScreenCaptureFallbackForced = false;

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
    // Note: ELECTRON_OZONE_PLATFORM_HINT was removed in Electron 38
    const hasOzonePlatformOverride = args.some((arg) =>
      arg.startsWith('--ozone-platform=')
    );

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

  app.whenReady().then(() => preloadBrowsersList());

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
      const isRdpSession =
        typeof sessionName === 'string' && sessionName !== 'Console';

      if (newSettingValue !== currentPersistedSetting && !isRdpSession) {
        relaunchApp();
      } else if (isRdpSession) {
        console.log(
          'Screen Capture Fallback setting changed in RDP session. Change will apply when running locally. No restart needed now since WGC is already disabled by RDP detection.'
        );
      }
    }
  );

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
