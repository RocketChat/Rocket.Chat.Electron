import { UpdateConfiguration } from './common';

export const UPDATE_SKIPPED = 'update/skipped';
export const UPDATES_CHECK_FOR_UPDATES_REQUESTED = 'updates/check-for-updates-requested';
export const UPDATES_CHECKING_FOR_UPDATE = 'updates/checking-for-update';
export const UPDATES_ERROR_THROWN = 'updates/error-thrown';
export const UPDATES_NEW_VERSION_AVAILABLE = 'updates/new-version-available';
export const UPDATES_NEW_VERSION_NOT_AVAILABLE = 'updates/new-version-not-available';
export const UPDATES_READY = 'updates/ready';

export type UpdatesActionTypeToPayloadMap = {
  [UPDATE_SKIPPED]: never;
  [UPDATES_CHECK_FOR_UPDATES_REQUESTED]: never;
  [UPDATES_CHECKING_FOR_UPDATE]: never;
  [UPDATES_ERROR_THROWN]: Error;
  [UPDATES_NEW_VERSION_AVAILABLE]: string;
  [UPDATES_NEW_VERSION_NOT_AVAILABLE]: never;
  [UPDATES_READY]: UpdateConfiguration;
};
