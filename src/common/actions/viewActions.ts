import { createAction } from '@reduxjs/toolkit';

export const changed = createAction(
  'view/changed',
  (view: 'add-new-server' | 'downloads' | { url: string }) => ({
    payload: {
      view,
    },
  })
);
