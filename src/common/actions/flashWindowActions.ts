import { createAction } from '@reduxjs/toolkit';

export const toggled = createAction(
  'flashWindow/toggled',
  (enabled: boolean) => ({
    payload: {
      enabled,
    },
  })
);
