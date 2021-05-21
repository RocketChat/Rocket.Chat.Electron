import { createAction } from '@reduxjs/toolkit';

import type { ExtendedNotificationOptions } from '../types/ExtendedNotificationOptions';

export const actioned = createAction(
  'notification/actioned',
  (id: string, index: number) => ({
    payload: {
      id,
      index,
    },
  })
);

export const clicked = createAction('notification/clicked', (id: string) => ({
  payload: {
    id,
  },
}));

export const closed = createAction('notification/closed', (id: string) => ({
  payload: {
    id,
  },
}));

export const dismissed = createAction(
  'notification/dismissed',
  (id: string) => ({
    payload: {
      id,
    },
  })
);

export const replied = createAction(
  'notification/replied',
  (id: string, reply: string) => ({
    payload: {
      id,
      reply,
    },
  })
);

export const shown = createAction('notification/shown', (id: string) => ({
  payload: {
    id,
  },
}));

export const created = createAction(
  'notification/created',
  (options: ExtendedNotificationOptions) => ({
    payload: {
      options,
    },
  })
);
