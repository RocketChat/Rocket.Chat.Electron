import { createAction } from '@reduxjs/toolkit';

export const toggled = createAction('sideBar/toggled', (enabled: boolean) => ({
  payload: {
    enabled,
  },
}));
