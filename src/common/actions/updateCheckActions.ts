import { createAction } from '@reduxjs/toolkit';

export const checkOnStartupToggled = createAction(
  'updateCheck/checkOnStartupToggled',
  (enabled: boolean) => ({
    payload: {
      enabled,
    },
  })
);

export const requested = createAction('updateCheck/requested');

export const started = createAction('updateCheck/started');

export const newVersionAvailable = createAction(
  'updateCheck/newVersionAvailable',
  (version: string) => ({
    payload: version,
  })
);

export const upToDate = createAction('updateCheck/upToDate');

export const failed = createAction('updateCheck/failed', (error: Error) => ({
  payload: error,
  error: true,
}));

export const newVersionSkipped = createAction(
  'updateCheck/newVersionSkipped',
  (version: string) => ({
    payload: {
      version,
    },
  })
);

export const newVersionSkippedForNow = createAction(
  'updateCheck/newVersionSkippedForNow'
);
