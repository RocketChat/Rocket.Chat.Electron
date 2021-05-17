import { createAction } from '@reduxjs/toolkit';

import type { Server } from '../types/Server';
import type { SystemIdleState } from '../types/SystemIdleState';

export const versionChanged = createAction(
  'server/versionChanged',
  (url: Server['url'], version: string) => ({
    payload: {
      url,
      version,
    },
  })
);

export const badgeChanged = createAction(
  'server/badgeChanged',
  (url: Server['url'], badge: Server['badge']) => ({
    payload: {
      url,
      badge,
    },
  })
);

export const faviconChanged = createAction(
  'server/faviconChanged',
  (url: Server['url'], favicon: Server['favicon']) => ({
    payload: {
      url,
      favicon,
    },
  })
);

export const styleChanged = createAction(
  'server/styleChanged',
  (url: Server['url'], style: Server['style']) => ({
    payload: {
      url,
      style,
    },
  })
);

export const titleChanged = createAction(
  'server/titleChanged',
  (url: Server['url'], title: Server['title']) => ({
    payload: {
      url,
      title,
    },
  })
);

export const userPresenceParamsChanged = createAction(
  'server/userPresenceParamsChanged',
  (
    url: Server['url'],
    presence:
      | {
          autoAwayEnabled: false;
        }
      | {
          autoAwayEnabled: true;
          idleThreshold: number | null;
        }
  ) => ({
    payload: {
      url,
      presence,
    },
  })
);

export const idleStateChanged = createAction(
  'server/idleStateChanged',
  (url: Server['url'], idleState: SystemIdleState) => ({
    payload: {
      url,
      idleState,
    },
  })
);

export const webviewAttached = createAction(
  'server/webviewAttached',
  (url: Server['url'], webContentsId: number) => ({
    payload: {
      url,
      webContentsId,
    },
  })
);
