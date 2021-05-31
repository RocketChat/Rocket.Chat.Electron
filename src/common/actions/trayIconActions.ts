import { createAction } from '@reduxjs/toolkit';

export const toggled = createAction('trayIcon/toggled', (enabled: boolean) => ({
  payload: {
    enabled,
  },
}));
