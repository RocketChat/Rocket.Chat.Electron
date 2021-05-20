import { createAction } from '@reduxjs/toolkit';

import type { DeepLink } from '../types/DeepLink';

export const triggered = createAction(
  'deepLinks/triggered',
  (deepLinks: DeepLink[]) => ({
    payload: {
      deepLinks,
    },
  })
);
