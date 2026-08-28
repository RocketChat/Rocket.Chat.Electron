import fs from 'fs';
import path from 'path';

import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { gt as semverGt, inc as semverInc } from 'semver';

import { listen, dispatch, select } from '../store';
import type { RootState } from '../store/rootReducer';
import { ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED } from '../ui/actions';
import {
  askUpdateInstall,
  AskUpdateInstallResponse,
  warnAboutInstallUpdateLater,
  warnAboutUpdateSkipped,
} from '../ui/main/dialogs';
import {
  UPDATE_SKIPPED,
  UPDATES_CHECK_FEEDBACK_DISMISSED,
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
  UPDATES_CHECKING_FOR_UPDATE,
  UPDATES_DOWNLOAD_PROGRESSED,
  UPDATES_DOWNLOAD_REQUESTED,
  UPDATES_ERROR_THROWN,
  UPDATES_INSTALL_REQUESTED,
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
  UPDATES_OPEN_STORE_PAGE_REQUESTED,
  UPDATES_READY,
  UPDATES_SIMULATION_REQUESTED,
  UPDATES_SKIP_REQUESTED,
  UPDATES_UPDATE_DOWNLOADED,
  UPDATES_CHANNEL_CHANGED,
} from './actions';
import type {
  AppLevelUpdateConfiguration,
  UpdateConfiguration,
  UpdateStore,
  UserLevelUpdateConfiguration,
} from './common';
import {
  detectUpdateStore,
  fetchLatestStoreVersion,
  isStoreVersionNewer,
  openStorePage,
} from './storeUpdates';

const readJsonObject = async (
  filePath: string
): Promise<Record<string, unknown>> => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const json = JSON.parse(content);

    return json && typeof json === 'object' && !Array.isArray(json) ? json : {};
  } catch (error) {
    return {};
  }
};

const readAppJsonObject = async (
  basename: string
): Promise<Record<string, unknown>> => {
  const filePath = path.join(
    app.getAppPath(),
    app.getAppPath().endsWith('app.asar') ? '..' : '.',
    basename
  );
  return readJsonObject(filePath);
};

const readUserJsonObject = async (
  basename: string
): Promise<Record<string, unknown>> => {
  const filePath = path.join(app.getPath('userData'), basename);
  return readJsonObject(filePath);
};

const loadAppConfiguration = async (): Promise<AppLevelUpdateConfiguration> =>
  readAppJsonObject('update.json');

const loadUserConfiguration = async (): Promise<UserLevelUpdateConfiguration> =>
  readUserJsonObject('update.json');

export const mergeConfigurations = (
  defaultConfiguration: UpdateConfiguration,
  appConfiguration: AppLevelUpdateConfiguration,
  userConfiguration: UserLevelUpdateConfiguration
): UpdateConfiguration => {
  const configuration = {
    ...defaultConfiguration,
    ...(typeof appConfiguration.forced === 'boolean' && {
      isEachUpdatesSettingConfigurable: !appConfiguration.forced,
    }),
    ...(typeof appConfiguration.canUpdate === 'boolean' && {
      isUpdatingEnabled: appConfiguration.canUpdate,
    }),
    ...(typeof appConfiguration.autoUpdate === 'boolean' && {
      doCheckForUpdatesOnStartup: appConfiguration.autoUpdate,
    }),
    ...(typeof appConfiguration.skip === 'string' && {
      skippedUpdateVersion: appConfiguration.skip,
    }),
    ...(typeof appConfiguration.channel === 'string' && {
      updateChannel: appConfiguration.channel,
    }),
  };

  if (
    typeof userConfiguration.autoUpdate === 'boolean' &&
    (configuration.isEachUpdatesSettingConfigurable ||
      typeof appConfiguration.autoUpdate === 'undefined')
  ) {
    configuration.doCheckForUpdatesOnStartup = userConfiguration.autoUpdate;
  }

  if (
    typeof userConfiguration.skip === 'string' &&
    (configuration.isEachUpdatesSettingConfigurable ||
      typeof appConfiguration.skip === 'undefined')
  ) {
    configuration.skippedUpdateVersion = userConfiguration.skip;
  }

  if (
    typeof userConfiguration.channel === 'string' &&
    (configuration.isEachUpdatesSettingConfigurable ||
      typeof appConfiguration.channel === 'undefined')
  ) {
    configuration.updateChannel = userConfiguration.channel;
  }

  return configuration;
};

const loadConfiguration = async (): Promise<UpdateConfiguration> => {
  const defaultConfiguration = select(
    ({
      isUpdatingEnabled,
      doCheckForUpdatesOnStartup,
      skippedUpdateVersion,
      isReportEnabled,
      isFlashFrameEnabled,
      isHardwareAccelerationEnabled,
      isInternalVideoChatWindowEnabled,
      isVideoCallScreenCaptureFallbackEnabled,
      updateChannel,
    }: RootState) => ({
      isUpdatingAllowed:
        (process.platform === 'linux' && !!process.env.APPIMAGE) ||
        (process.platform === 'win32' && !process.windowsStore) ||
        (process.platform === 'darwin' && !process.mas),
      updateStore: detectUpdateStore(),
      isEachUpdatesSettingConfigurable: true,
      isUpdatingEnabled,
      doCheckForUpdatesOnStartup,
      skippedUpdateVersion,
      isReportEnabled,
      isFlashFrameEnabled,
      isHardwareAccelerationEnabled,
      isInternalVideoChatWindowEnabled,
      isVideoCallScreenCaptureFallbackEnabled,
      updateChannel,
    })
  );
  const appConfiguration = await loadAppConfiguration();
  const userConfiguration = await loadUserConfiguration();

  return mergeConfigurations(
    defaultConfiguration,
    appConfiguration,
    userConfiguration
  );
};

let isUserInitiatedCheck = false;

/**
 * Set while the download was started from the titlebar update label. The label
 * reports progress and offers the restart itself, so the legacy modal prompts
 * are skipped for that path.
 */
let isLabelInitiatedDownload = false;

/** Developer-mode flow that never contacts the update server nor restarts. */
let isSimulatingUpdate = false;
let simulatedDownloadTimer: ReturnType<typeof setInterval> | null = null;

const stopSimulatedDownload = (): void => {
  if (simulatedDownloadTimer) {
    clearInterval(simulatedDownloadTimer);
    simulatedDownloadTimer = null;
  }
};

const startSimulatedDownload = (): void => {
  stopSimulatedDownload();

  let percent = 0;
  simulatedDownloadTimer = setInterval(() => {
    percent += 7;

    if (percent >= 100) {
      stopSimulatedDownload();
      dispatch({ type: UPDATES_UPDATE_DOWNLOADED });
      return;
    }

    dispatch({ type: UPDATES_DOWNLOAD_PROGRESSED, payload: percent });
  }, 250);
};

const endSimulatedUpdate = (): void => {
  stopSimulatedDownload();
  isSimulatingUpdate = false;
  isLabelInitiatedDownload = false;
  dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
};

// Thrown values are not guaranteed to be Errors, and the dispatched payload
// crosses the IPC boundary, so it has to be a plain serializable object.
const normalizeUpdateError = (
  error: unknown
): Pick<Error, 'message' | 'stack' | 'name'> =>
  error instanceof Error
    ? { message: error.message, stack: error.stack, name: error.name }
    : { message: String(error), stack: undefined, name: 'Error' };

/** Quits and relaunches into the freshly downloaded update. */
const installDownloadedUpdate = (): void => {
  // The try/catch must live inside the setImmediate callback: a throw from a
  // later tick escapes a catch wrapping only the scheduling call, which is how
  // macOS install failures went unreported for years (see #955).
  setImmediate(() => {
    // Detached so the pending quit isn't cancelled by the app's own
    // window-all-closed handler. If the install fails we never quit, so the
    // listeners have to go back or closing every window would no longer
    // reach that handler for the rest of the session.
    const windowAllClosedListeners = app.listeners('window-all-closed');
    app.removeAllListeners('window-all-closed');

    try {
      autoUpdater.quitAndInstall(true, true);
    } catch (error) {
      for (const listener of windowAllClosedListeners) {
        app.addListener('window-all-closed', listener as () => void);
      }

      dispatch({
        type: UPDATES_ERROR_THROWN,
        payload: normalizeUpdateError(error),
      });
    }
  });
};

/**
 * GitHub intermittently answers the release-metadata request with an empty
 * body, which electron-updater surfaces as ERR_UPDATER_NO_PUBLISHED_VERSIONS
 * ("No published versions on GitHub") even though releases exist, and slow or
 * flaky networks produce similar one-off failures. A short retry ladder rides
 * those out.
 *
 * While a ladder is in flight it owns error reporting: the autoUpdater `error`
 * listener stays quiet and the ladder's caller decides what the final failure
 * means (a manual check reports to the UI, an automatic one only logs).
 */
const UPDATE_CHECK_RETRY_DELAYS_MS = [2_000, 5_000];

let isUpdateCheckInFlight = false;

const checkForUpdatesWithRetry = async (attempt = 0): Promise<void> => {
  isUpdateCheckInFlight = true;

  try {
    await autoUpdater.checkForUpdates();
    isUpdateCheckInFlight = false;
  } catch (error) {
    if (attempt >= UPDATE_CHECK_RETRY_DELAYS_MS.length) {
      isUpdateCheckInFlight = false;
      throw error;
    }

    console.warn(
      `Update check failed (attempt ${attempt + 1} of ${
        UPDATE_CHECK_RETRY_DELAYS_MS.length + 1
      }), retrying:`,
      error instanceof Error ? error.message : error
    );
    await new Promise((resolve) => {
      setTimeout(resolve, UPDATE_CHECK_RETRY_DELAYS_MS[attempt]);
    });
    return checkForUpdatesWithRetry(attempt + 1);
  }
};

let pendingUpdateCheck: Promise<void> | null = null;

/**
 * Starts a retried update check, or joins the one already running — a manual
 * check requested during the startup ladder's backoff window must not race a
 * second ladder (and its error-suppression flag) against the first.
 */
const requestUpdateCheck = (): Promise<void> => {
  if (!pendingUpdateCheck) {
    pendingUpdateCheck = checkForUpdatesWithRetry().finally(() => {
      pendingUpdateCheck = null;
    });
  }

  return pendingUpdateCheck;
};

const dispatchUpdateError = (error: unknown): void => {
  if (error instanceof Error) {
    dispatch({
      type: UPDATES_ERROR_THROWN,
      payload: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    });
  }
};

/** Store URL from the last successful store version lookup, used by the "Open store page" action. */
let lastKnownStoreUrl: string | undefined;

/**
 * Runs a user-initiated update check against a store's own version lookup
 * instead of electron-updater. Mirrors the non-store check's dispatch
 * sequence (checking → available/not-available) and error-reporting
 * convention (a failed lookup is not actionable for the user: warn-level log
 * + UPDATES_ERROR_THROWN, never a modal). Only called for stores that expose
 * a version API (mas, snap, flatpak) — windows has none, see
 * setupUpdateLabelFlow's UPDATES_CHECK_FOR_UPDATES_REQUESTED listener.
 */
const checkForStoreUpdate = async (
  store: Exclude<UpdateStore, null>
): Promise<void> => {
  dispatch({ type: UPDATES_CHECKING_FOR_UPDATE });

  try {
    const result = await fetchLatestStoreVersion(store);

    if (!result) {
      console.warn(`Store (${store}) update check failed: no result`);
      // dispatchUpdateError shapes the payload as a plain
      // { message, stack, name } object (not a real Error instance) — the
      // action crosses to renderers via webContents.send, whose structured
      // clone resets a real Error's custom `name` back to 'Error'.
      dispatchUpdateError(
        Object.assign(new Error(`Store (${store}) update check failed`), {
          name: 'StoreLookupError',
        })
      );
      return;
    }

    const currentVersion = app.getVersion();

    if (!isStoreVersionNewer(result.version, currentVersion)) {
      lastKnownStoreUrl = undefined;
      dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
      return;
    }

    lastKnownStoreUrl = result.storeUrl;
    dispatch({
      type: UPDATES_NEW_VERSION_AVAILABLE,
      payload: result.version,
    });
  } catch (error) {
    console.warn(
      `Store (${store}) update check failed:`,
      error instanceof Error ? error.message : error
    );
    dispatchUpdateError(error);
  }
};

/**
 * Wires the titlebar update label to the updater. Registered before the
 * "updating not allowed/enabled" bail-out so the simulated flow stays available
 * in builds that cannot self-update (e.g. unpackaged development runs).
 */
export const setupUpdateLabelFlow = (): void => {
  listen(UPDATES_SIMULATION_REQUESTED, async () => {
    stopSimulatedDownload();
    isSimulatingUpdate = true;
    isLabelInitiatedDownload = true;

    const currentVersion = app.getVersion();
    const simulatedVersion =
      semverInc(currentVersion, 'minor') ?? `${currentVersion}-simulated`;

    dispatch({
      type: UPDATES_NEW_VERSION_AVAILABLE,
      payload: simulatedVersion,
    });
  });

  listen(UPDATES_DOWNLOAD_REQUESTED, async () => {
    isLabelInitiatedDownload = true;

    if (isSimulatingUpdate) {
      startSimulatedDownload();
      return;
    }

    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      isLabelInitiatedDownload = false;
      dispatchUpdateError(error);
    }
  });

  // Store builds cannot self-update: hand the user off to the store's own
  // page instead of touching autoUpdater. Kept as a distinct listener
  // (rather than a branch inside UPDATES_DOWNLOAD_REQUESTED) so the
  // download-status reducers, which see every FSA regardless of this
  // branch, never flip to "downloading" for a build that never downloads
  // anything.
  listen(UPDATES_OPEN_STORE_PAGE_REQUESTED, async () => {
    const store = detectUpdateStore();

    if (!store) {
      return;
    }

    try {
      await openStorePage(store, lastKnownStoreUrl);
    } catch (error) {
      dispatchUpdateError(error);
    }
  });

  listen(UPDATES_INSTALL_REQUESTED, async () => {
    if (isSimulatingUpdate) {
      // Nothing to install — unwind the simulation instead of restarting.
      endSimulatedUpdate();
      return;
    }

    try {
      installDownloadedUpdate();
    } catch (error) {
      dispatchUpdateError(error);
    }
  });

  listen(UPDATES_SKIP_REQUESTED, async (action) => {
    if (isSimulatingUpdate) {
      // Skipping a fake version must not persist into the real settings.
      endSimulatedUpdate();
      return;
    }

    await warnAboutUpdateSkipped();
    dispatch({ type: UPDATE_SKIPPED, payload: action.payload });
  });

  // Store builds cannot use electron-updater, so their user-initiated check
  // is registered here (unconditionally) instead of in setupUpdates, which
  // bails out before reaching the electron-updater-only listener below.
  listen(UPDATES_CHECK_FOR_UPDATES_REQUESTED, async () => {
    const store = detectUpdateStore();

    if (!store) {
      return;
    }

    isUserInitiatedCheck = true;

    // windows has no version-lookup API (see storeUpdates.ts) — the Store
    // app itself is the only source of truth for whether an update exists,
    // so open it directly instead of faking a checking/available sequence.
    // UPDATES_CHECK_FOR_UPDATES_REQUESTED already flipped updateCheckStatus
    // to 'checking' (see reducers.ts) before this listener ran, and nothing
    // else settles it for this path, so it must be dismissed explicitly on
    // success — never NEW_VERSION_NOT_AVAILABLE, since we never actually
    // checked anything and must not claim "up to date".
    if (store === 'windows') {
      try {
        await openStorePage(store);
        dispatch({ type: UPDATES_CHECK_FEEDBACK_DISMISSED });
      } catch (error) {
        dispatchUpdateError(error);
      }
      return;
    }

    await checkForStoreUpdate(store);
  });
};

export const setupUpdates = async (): Promise<void> => {
  // This is necessary to make the updater work in development mode
  if (process.env.NODE_ENV === 'development') {
    Object.defineProperty(app, 'isPackaged', {
      get() {
        return true;
      },
    });
    autoUpdater.updateConfigPath = path.join(
      app.getAppPath(),
      'dev-app-update.yml'
    );
  }

  autoUpdater.autoDownload = false;

  // electron-updater logs transient check failures (flaky GitHub metadata
  // responses, offline machines) at error level, which reads as an app fault
  // in user-shared logs even though the user can do nothing about it. Route
  // its logging through warn and below — failures that matter to the user
  // reach the UI through the store, not the log.
  autoUpdater.logger = {
    info: (message) => console.log(message),
    warn: (message) => console.warn(message),
    error: (message) => console.warn(message),
    debug: (message) => console.debug(message),
  };

  const {
    isUpdatingAllowed,
    isEachUpdatesSettingConfigurable,
    isUpdatingEnabled,
    doCheckForUpdatesOnStartup,
    skippedUpdateVersion,
    isReportEnabled,
    isFlashFrameEnabled,
    isHardwareAccelerationEnabled,
    isInternalVideoChatWindowEnabled,
    isVideoCallScreenCaptureFallbackEnabled,
    updateChannel,
    updateStore,
  } = await loadConfiguration();

  dispatch({
    type: UPDATES_READY,
    payload: {
      isUpdatingAllowed,
      isEachUpdatesSettingConfigurable,
      isUpdatingEnabled,
      doCheckForUpdatesOnStartup,
      skippedUpdateVersion,
      isReportEnabled,
      isFlashFrameEnabled,
      isHardwareAccelerationEnabled,
      isInternalVideoChatWindowEnabled,
      isVideoCallScreenCaptureFallbackEnabled,
      updateChannel,
      updateStore,
    },
  });

  // Registered first so the simulated flow (and the label's own actions) stay
  // reachable even when this build cannot self-update.
  setupUpdateLabelFlow();

  // The store update path (mas/windows/snap/flatpak) is wired inside
  // setupUpdateLabelFlow's listeners (gated on detectUpdateStore()); it does
  // not depend on isUpdatingAllowed (which is already false for mas/windows
  // by construction, and irrelevant for snap/flatpak) nor on electron-updater
  // setup below. electron-updater must never initialize for any store build.
  if (updateStore !== null) {
    return;
  }

  if (!isUpdatingAllowed || !isUpdatingEnabled) {
    return;
  }

  // Set initial channel
  autoUpdater.channel = updateChannel;

  // Enable prerelease updates for alpha and beta channels
  if (updateChannel === 'alpha' || updateChannel === 'beta') {
    autoUpdater.allowPrerelease = true;
  }

  // Listen for channel changes
  listen(ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED, async (action) => {
    const newChannel = action.payload;
    autoUpdater.channel = newChannel;

    // Enable prerelease updates for alpha and beta channels
    autoUpdater.allowPrerelease =
      newChannel === 'alpha' || newChannel === 'beta';

    dispatch({
      type: UPDATES_CHANNEL_CHANGED,
      payload: newChannel,
    });
  });

  autoUpdater.addListener('checking-for-update', () => {
    dispatch({ type: UPDATES_CHECKING_FOR_UPDATE });
  });

  autoUpdater.addListener('update-available', ({ version }) => {
    const skippedUpdateVersion = select(
      ({ skippedUpdateVersion }) => skippedUpdateVersion
    );
    if (!isUserInitiatedCheck && skippedUpdateVersion === version) {
      dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
      return;
    }

    // Prevent showing "updates" that are actually downgrades
    // This can happen when generateUpdatesFilesForAllChannels is enabled
    // and the user is running a newer dev/PR build than the published release
    const currentVersion = app.getVersion();
    try {
      if (!semverGt(version as string, currentVersion)) {
        dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
        return;
      }
    } catch {
      // If version comparison fails, proceed with the update
    }

    dispatch({
      type: UPDATES_NEW_VERSION_AVAILABLE,
      payload: version as string,
    });
  });

  autoUpdater.addListener('update-not-available', () => {
    dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
  });

  autoUpdater.addListener('download-progress', ({ percent }) => {
    dispatch({
      type: UPDATES_DOWNLOAD_PROGRESSED,
      payload: Math.max(0, Math.min(100, Math.round(percent))),
    });
  });

  autoUpdater.addListener('update-downloaded', async () => {
    dispatch({ type: UPDATES_UPDATE_DOWNLOADED });

    // Downloads started from the titlebar label surface the restart action in
    // the label itself, so the modal prompt would be redundant.
    if (isLabelInitiatedDownload) {
      isLabelInitiatedDownload = false;
      return;
    }

    const response = await askUpdateInstall();

    if (response === AskUpdateInstallResponse.INSTALL_LATER) {
      await warnAboutInstallUpdateLater();
      return;
    }

    try {
      installDownloadedUpdate();
    } catch (error) {
      dispatchUpdateError(error);
    }
  });

  autoUpdater.addListener('error', (error) => {
    // A check ladder owns error reporting for its final outcome; this listener
    // only covers failures outside a check (e.g. downloads).
    if (isUpdateCheckInFlight) {
      return;
    }

    dispatch({
      type: UPDATES_ERROR_THROWN,
      payload: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    });
  });

  if (doCheckForUpdatesOnStartup) {
    // Deliberately not awaited: the rest of the app setup must not wait on
    // GitHub, especially while failed attempts back off and retry.
    isUserInitiatedCheck = false;
    requestUpdateCheck().catch((error) => {
      // An automatic check failing is nothing a user can act on — keep the UI
      // quiet, settle the "checking" state, and leave a note in the log.
      console.warn(
        'Automatic update check failed:',
        error instanceof Error ? error.message : error
      );
      dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
    });
  }

  listen(UPDATES_CHECK_FOR_UPDATES_REQUESTED, async () => {
    try {
      isUserInitiatedCheck = true;
      await new Promise((resolve) => setTimeout(resolve, 100));
      await requestUpdateCheck();
    } catch (error) {
      // A failed check isn't actionable for the user either: resolve to the
      // benign "no update available" outcome and keep the details in the log.
      console.warn(
        'Update check failed:',
        error instanceof Error ? error.message : error
      );
      dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE });
    }
  });
};
