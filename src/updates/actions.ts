import type { UpdateConfiguration } from './common';

export const UPDATE_SKIPPED = 'update/skipped';
export const UPDATES_CHECK_FOR_UPDATES_REQUESTED =
  'updates/check-for-updates-requested';
export const UPDATES_CHECKING_FOR_UPDATE = 'updates/checking-for-update';
export const UPDATES_ERROR_THROWN = 'updates/error-thrown';
export const UPDATES_NEW_VERSION_AVAILABLE = 'updates/new-version-available';
export const UPDATES_NEW_VERSION_NOT_AVAILABLE =
  'updates/new-version-not-available';
export const UPDATES_READY = 'updates/ready';
export const UPDATES_CHANNEL_CHANGED = 'updates/channel-changed';
export const UPDATES_DOWNLOAD_PROGRESSED = 'updates/download-progressed';
export const UPDATES_UPDATE_DOWNLOADED = 'updates/update-downloaded';
/** The titlebar update label was clicked while an update was available. */
export const UPDATES_DOWNLOAD_REQUESTED = 'updates/download-requested';
/** The titlebar update label was clicked once the update finished downloading. */
export const UPDATES_INSTALL_REQUESTED = 'updates/install-requested';
/** "Skip this version" was chosen in the titlebar update panel. */
export const UPDATES_SKIP_REQUESTED = 'updates/skip-requested';
/**
 * Visibility of the titlebar update panel. Kept in the store rather than as
 * local component state so other surfaces — the About dialog after a manual
 * check — can open it.
 */
export const UPDATES_PANEL_TOGGLED = 'updates/panel-toggled';
/** Developer-mode entry point that walks the whole flow without a real update. */
export const UPDATES_SIMULATION_REQUESTED = 'updates/simulation-requested';
/**
 * Dismisses the transient "up to date" / "check failed" titlebar feedback,
 * either by clicking it or by its auto-hide timer.
 */
export const UPDATES_CHECK_FEEDBACK_DISMISSED =
  'updates/check-feedback-dismissed';

export type UpdatesActionTypeToPayloadMap = {
  [UPDATE_SKIPPED]: string | null;
  [UPDATES_CHECK_FOR_UPDATES_REQUESTED]: void;
  [UPDATES_CHECKING_FOR_UPDATE]: void;
  [UPDATES_ERROR_THROWN]: Error;
  [UPDATES_NEW_VERSION_AVAILABLE]: string;
  [UPDATES_NEW_VERSION_NOT_AVAILABLE]: void;
  [UPDATES_READY]: UpdateConfiguration;
  [UPDATES_CHANNEL_CHANGED]: string;
  [UPDATES_DOWNLOAD_PROGRESSED]: number;
  [UPDATES_UPDATE_DOWNLOADED]: void;
  [UPDATES_DOWNLOAD_REQUESTED]: void;
  [UPDATES_INSTALL_REQUESTED]: void;
  [UPDATES_SKIP_REQUESTED]: string | null;
  [UPDATES_PANEL_TOGGLED]: boolean;
  [UPDATES_SIMULATION_REQUESTED]: void;
  [UPDATES_CHECK_FEEDBACK_DISMISSED]: void;
};
