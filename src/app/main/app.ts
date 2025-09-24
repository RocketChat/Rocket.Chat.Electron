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
  const command = process.argv.slice(1, app.isPackaged ? 1 : 2);
  app.relaunch({ args: [...command, ...args] });
  app.exit();
};

export const performElectronStartup = (): void => {
  app.setAsDefaultProtocolClient(electronBuilderJsonInformation.protocol);
  app.setAppUserModelId(electronBuilderJsonInformation.appId);

  app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch(
    'disable-features',
    'HardwareMediaKeyHandling,MediaSessionService'
  );

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

  dispatch({
    type: APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET,
    payload: isScreenCaptureFallbackForced,
  });

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

    dispatch({
      type: APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET,
      payload: isScreenCaptureFallbackForced,
    });

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
      app.commandLine.appendSwitch(
        'disable-features',
        'WebRtcAllowWgcDesktopCapturer'
      );
    }
  }
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

  app.whenReady().then(() => preloadBrowsersList());

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
