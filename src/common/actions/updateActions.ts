import { createAction } from '@reduxjs/toolkit';

export const skipped = createAction(
  'update/skipped',
  (version: string | null) => ({
    payload: version,
  })
);

export const failed = createAction('update/failed', (error: Error) => ({
  payload: error,
  error: true,
}));

export const downloading = createAction('update/downloading');

export const downloaded = createAction('update/downloaded');
