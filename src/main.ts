import { app } from 'electron';

import {
  performElectronStartup,
  setupApp,
  initializeScreenCaptureFallbackState,
  setupGpuCrashHandler,
  markMainWindowStable,
  relaunchApp,
} from './app/main/app';
import {
  mergePersistableValues,
  watchAndPersistChanges,
} from './app/main/data';
import { setUserDataDirectory } from './app/main/dev';
import { setupDeepLinks, processDeepLinksInArgs } from './deepLinks/main';
import { startDocumentViewerHandler } from './documentViewer/ipc';
import { setupDownloads } from './downloads/main';
import { setupElectronDlWithTracking } from './downloads/main/setup';
import { setupMainErrorHandling } from './errors';
import i18n from './i18n/main';
import { handleJitsiDesktopCapturerGetSources } from './jitsi/ipc';
import { setupNavigation } from './navigation/main';
import attentionDrawing from './notifications/attentionDrawing';
import { setupNotifications } from './notifications/main';
import { startOutlookCalendarUrlHandler } from './outlookCalendar/ipc';
import { setupScreenSharing } from './screenSharing/main';
import { handleClearCacheDialog } from './servers/cache';
import { setupServers } from './servers/main';
import { checkSupportedVersionServers } from './servers/supportedVersions/main';
import { setupSpellChecking } from './spellChecking/main';
import { createMainReduxStore } from './store';
import { readGpuFallbackMode } from './store/readSetting';
import { handleCertificatesManager } from './ui/components/CertificatesManager/main';
import dock from './ui/main/dock';
import menuBar from './ui/main/menuBar';
import {
  createRootWindow,
  showRootWindow,
  exportLocalStorage,
  watchMachineTheme,
} from './ui/main/rootWindow';
import { attachGuestWebContentsEvents } from './ui/main/serverView';
import touchBar from './ui/main/touchBar';
import trayIcon from './ui/main/trayIcon';
import { setupUpdates } from './updates/main';
import { setupPowerMonitor } from './userPresence/main';
import {
  handleDesktopCapturerGetSources,
  startVideoCallWindowHandler,
  cleanupVideoCallResources,
} from './videoCallWindow/ipc';

// Handle Wayland detection and X11 fallback BEFORE Electron fully initializes
// ozone-platform must be set via command line, not appendSwitch
// In development, rollup.config.mjs handles this; in production, we relaunch if needed
const handleLinuxDisplayServer = (): void => {
  if (process.platform !== 'linux') {
    return;
  }

  // In development mode, rollup.config.mjs passes the flag - skip relaunch logic
  if (!app.isPackaged) {
    return;
  }

  const args = process.argv;
  const hasOzonePlatformFlag = args.some((arg) =>
    arg.startsWith('--ozone-platform=')
  );

  // If ozone-platform is already set via command line, respect it
  if (hasOzonePlatformFlag) {
    return;
  }

  const gpuFallbackMode = readGpuFallbackMode();

  // Determine if we need to relaunch with X11 flag
  let needsX11 = false;

  const isWaylandSession = process.env.XDG_SESSION_TYPE === 'wayland';

  if (gpuFallbackMode === 'x11') {
    needsX11 = true;
  } else if (gpuFallbackMode === 'wayland') {
    // User explicitly wants native Wayland, don't add X11 flag
    needsX11 = false;
  }
  // When gpuFallbackMode is 'none' (auto-detect), let Electron use native Wayland
  // The GPU crash handler will fallback to X11 if there are issues

  if (needsX11) {
    console.log('Using X11 mode as configured in settings', {
      gpuFallbackMode,
      isWaylandSession,
    });
    relaunchApp('--ozone-platform=x11');
  } else if (isWaylandSession) {
    console.log('Running with native Wayland support', {
      gpuFallbackMode,
    });
  }
};

const start = async (): Promise<void> => {
  setUserDataDirectory();

  // Check for Wayland and relaunch with X11 if needed (must happen before performElectronStartup)
  handleLinuxDisplayServer();

  performElectronStartup();

  // Set up GPU crash handler BEFORE whenReady to catch early GPU failures
  setupGpuCrashHandler();

  await app.whenReady();

  createMainReduxStore();

  // Initialize screen capture fallback state after store is available
  initializeScreenCaptureFallbackState();

  // Set up electron-dl with our download tracking callbacks
  setupElectronDlWithTracking();

  const localStorage = await exportLocalStorage();
  await mergePersistableValues(localStorage);
  await setupServers(localStorage);

  i18n.setUp();
  await i18n.wait();

  setupApp();

  setupMainErrorHandling();

  createRootWindow();
  startOutlookCalendarUrlHandler();
  attachGuestWebContentsEvents();
  await showRootWindow();

  // Mark main window as stable - GPU crashes after this won't trigger fallback
  markMainWindowStable();

  // React DevTools is currently incompatible with Electron 10
  // if (process.env.NODE_ENV === 'development') {
  //   installDevTools();
  // }
  watchMachineTheme();
  setupNotifications();
  attentionDrawing.setUp();
  setupScreenSharing();
  startVideoCallWindowHandler();

  await setupSpellChecking();

  setupDeepLinks();
  await setupNavigation();
  setupPowerMonitor();
  await setupUpdates();
  setupDownloads();
  handleCertificatesManager();

  dock.setUp();
  menuBar.setUp();
  touchBar.setUp();
  trayIcon.setUp();

  app.addListener('before-quit', () => {
    dock.tearDown();
    menuBar.tearDown();
    touchBar.tearDown();
    trayIcon.tearDown();
    attentionDrawing.tearDown();
    cleanupVideoCallResources();
  });

  watchAndPersistChanges();
  handleJitsiDesktopCapturerGetSources();
  handleDesktopCapturerGetSources();
  handleClearCacheDialog();
  startDocumentViewerHandler();
  checkSupportedVersionServers();

  await processDeepLinksInArgs();

  console.log('Application initialization completed successfully');
};

start();
