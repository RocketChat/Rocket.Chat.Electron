import { createAction } from '@reduxjs/toolkit';

export const toggled = createAction('menuBar/toggled', (enabled: boolean) => ({
  payload: {
    enabled,
  },
}));
