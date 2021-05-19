import { createAction } from '@reduxjs/toolkit';

import type { RootWindowIcon } from '../types/RootWindowIcon';
import type { WindowState } from '../types/WindowState';

export const iconChanged = createAction(
  'rootWindow/iconChanged',
  (icon: RootWindowIcon | undefined) => ({
    payload: {
      icon,
    },
  })
);

export const stateChanged = createAction(
  'rootWindow/stateChanged',
  (state: WindowState) => ({
    payload: {
      state,
    },
  })
);

export const focused = createAction('rootWindow/focused');

export const fullscreenToggled = createAction(
  'rootWindow/fullscreenToggled',
  (enabled: boolean) => ({
    payload: {
      enabled,
    },
  })
);

export const zoomReset = createAction('rootWindow/zoomReset');

export const zoomedIn = createAction('rootWindow/zoomedIn');

export const zoomedOut = createAction('rootWindow/zoomedOut');

export const reloaded = createAction('rootWindow/reloaded');

export const devToolsToggled = createAction(
  'rootWindow/devToolsToggled',
  (enabled: boolean) => ({
    payload: {
      enabled,
    },
  })
);

export const toggled = createAction('rootWindow/toggled');
