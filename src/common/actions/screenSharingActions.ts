import { createAction } from '@reduxjs/toolkit';

export const sourceRequested = createAction('screenSharing/sourceRequested');

export const sourceSelected = createAction(
  'screenSharing/sourceSelected',
  (sourceId: string) => ({
    payload: sourceId,
  })
);

export const sourceDenied = createAction('screenSharing/sourceDenied');
