import { createAction } from '@reduxjs/toolkit';

export const push = createAction(
  'dialog/push',
  (
    name: 'about' | 'update' | 'screen-sharing' | 'select-client-certificate'
  ) => ({
    payload: {
      name,
    },
  })
);

export const pop = createAction('dialog/pop');
