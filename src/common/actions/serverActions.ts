import { createAction } from '@reduxjs/toolkit';

import type { Server } from '../types/Server';
import type { SystemIdleState } from '../types/SystemIdleState';
import {
  WEBVIEW_FAVICON_CHANGED,
  WEBVIEW_SIDEBAR_STYLE_CHANGED,
  WEBVIEW_TITLE_CHANGED,
} from './uiActions';

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
  WEBVIEW_FAVICON_CHANGED,
  (url: Server['url'], favicon: Server['favicon']) => ({
    payload: {
      url,
      favicon,
    },
  })
);

export const styleChanged = createAction(
  WEBVIEW_SIDEBAR_STYLE_CHANGED,
  (url: Server['url'], style: Server['style']) => ({
    payload: {
      url,
      style,
    },
  })
);

export const titleChanged = createAction(
  WEBVIEW_TITLE_CHANGED,
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
