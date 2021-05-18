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
