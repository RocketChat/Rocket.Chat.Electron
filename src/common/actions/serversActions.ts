import { createAction } from '@reduxjs/toolkit';

import type { Server } from '../types/Server';

export const sorted = createAction(
  'servers/sorted',
  (urls: Server['url'][]) => ({
    payload: {
      urls,
    },
  })
);
