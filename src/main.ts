import { app, dialog } from 'electron';

import {
  performElectronStartup,
  setupApp,
  initializeScreenCaptureFallbackState,
  setupGpuCrashHandler,
} from './app/main/app';
import {
  mergePersistableValues,
  watchAndPersistChanges,
} from './app/main/data';
import { setUserDataDirectory } from './app/main/dev';
import { flushPersistedValues } from './app/main/persistence';
import { startBrowserHandler } from './browser/ipc';
import { setupDeepLinks, processDeepLinksInArgs } from './deepLinks/main';
import { startDocumentViewerHandler } from './documentViewer/ipc';
import { startDocumentViewerWindowHandler } from './documentViewerWindow/ipc';
import { setupDownloads } from './downloads/main';
import { setupElectronDlWithTracking } from './downloads/main/setup';
import {
  restoreDownloadsWindow,
  startDownloadsWindowHandler,
} from './downloadsWindow/ipc';
import { setupMainErrorHandling } from './errors';
import i18n from './i18n/main';
import { handleJitsiDesktopCapturerGetSources } from './jitsi/ipc';
import {
  restoreLogViewerWindow,
  startLogViewerWindowHandler,
} from './logViewerWindow/ipc';
import {
  logger,
  setupWebContentsLogging,
  cleanupOldLogs,
  setupDebugLoggingWatch,
} from './logging';
import { setupNavigation } from './navigation/main';
import attentionDrawing from './notifications/attentionDrawing';
import { setupNotifications } from './notifications/main';
import {
  startOutlookCalendarUrlHandler,
  stopOutlookCalendarSync,
} from './outlookCalendar/ipc';
import { setupOutlookLogger } from './outlookCalendar/logger';
import { handleDesktopCapturerGetSources } from './screenSharing/desktopCapturerCache';
import { setupScreenSharing } from './screenSharing/main';
import { startServerViewScreenSharingHandler } from './screenSharing/serverViewScreenSharing';
import { setupBootWatchdog } from './servers/bootWatchdog';
import {
  handleClearCacheDialog,
  handleUserLoggedOutDataClearing,
} from './servers/cache';
import { setupServers } from './servers/main';
import { checkSupportedVersionServers } from './servers/supportedVersions/main';
import {
  restoreSettingsWindow,
  startSettingsWindowHandler,
} from './settingsWindow/ipc';
import { setupSpellChecking } from './spellChecking/main';
import { createMainReduxStore } from './store';
import { applySystemCertificates } from './systemCertificates';
import { setupTelephonyIpc } from './telephony/ipc';
import {
  setupTelephonyDefaultHandlerPrompt,
  setupTelephonyGlobalShortcut,
  setupTelephonyProtocolHandlers,
} from './telephony/main';
import { handleCertificatesManager } from './ui/components/CertificatesManager/main';
import dock from './ui/main/dock';
import menuBar from './ui/main/menuBar';
import {
  createRootWindow,
  showRootWindow,
  exportLocalStorage,
  watchMachineTheme,
} from './ui/main/rootWindow';
import { startSecondaryWindowControlsHandler } from './ui/main/secondaryWindowControls';
import { attachGuestWebContentsEvents } from './ui/main/serverView';
import touchBar from './ui/main/touchBar';
import trayIcon from './ui/main/trayIcon';
import { setupUpdates } from './updates/main';
import { setupPowerMonitor } from './userPresence/main';
import {
  startVideoCallWindowHandler,
  cleanupVideoCallResources,
} from './videoCallWindow/ipc';

/**
 * Startup can fail before any window exists, which otherwise looks like the
 * app silently refusing to launch. `showErrorBox` is used because it is the
 * only dialog available before `app.whenReady()` resolves.
 */
const showStartupFailureDialog = (error: unknown): void => {
  const detail = error instanceof Error ? error.message : String(error);

  try {
    dialog.showErrorBox(
      'Rocket.Chat could not start',
      `${detail}\n\nIf this keeps happening, please report it with the log file at:\n${app.getPath(
        'logs'
      )}`
    );
  } catch (dialogError) {
    logger.error('Failed to show the startup failure dialog', dialogError);
  }
};

const start = async (): Promise<void> => {
  setUserDataDirectory();
  applySystemCertificates();

  logger.info('Starting Rocket.Chat Desktop application');

  setupWebContentsLogging();

  performElectronStartup();
  setupDeepLinks();

  // BEFORE whenReady so early GPU failures are caught
  setupGpuCrashHandler();

  await app.whenReady();

  cleanupOldLogs();

  createMainReduxStore();

  // Must be listening before any server view can boot and dispatch
  // WEBVIEW_SERVER_VERSION_UPDATED — listen() does not replay actions.
  setupBootWatchdog();

  setupOutlookLogger();
  setupDebugLoggingWatch();

  initializeScreenCaptureFallbackState();

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

  watchMachineTheme();
  setupNotifications();
  attentionDrawing.setUp();
  setupScreenSharing();
  startServerViewScreenSharingHandler();
  startVideoCallWindowHandler();
  startSecondaryWindowControlsHandler();
  startDocumentViewerWindowHandler();
  startLogViewerWindowHandler();
  startDownloadsWindowHandler();
  startSettingsWindowHandler();

  await setupSpellChecking();

  setupTelephonyGlobalShortcut();
  setupTelephonyProtocolHandlers();
  setupTelephonyDefaultHandlerPrompt();
  setupTelephonyIpc();
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
    stopOutlookCalendarSync();
    cleanupVideoCallResources();
    flushPersistedValues();
  });

  watchAndPersistChanges();
  handleJitsiDesktopCapturerGetSources();
  handleDesktopCapturerGetSources();
  handleClearCacheDialog();
  handleUserLoggedOutDataClearing();
  startDocumentViewerHandler();
  startBrowserHandler();
  checkSupportedVersionServers();

  await restoreLogViewerWindow();
  await restoreDownloadsWindow();
  await restoreSettingsWindow();

  await processDeepLinksInArgs();

  console.info('Application initialization completed successfully');
};

start().catch((error) => {
  logger.error('Failed to start application', error);
  showStartupFailureDialog(error);
  app.exit(1);
});
