import { createAction } from '@reduxjs/toolkit';

import type { RootWindowIcon } from '../types/RootWindowIcon';

export const iconChanged = createAction(
  'rootWindow/iconChanged',
  (icon: RootWindowIcon | undefined) => ({
    payload: {
      icon,
    },
  })
);
