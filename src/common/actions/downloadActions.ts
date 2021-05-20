import { createAction } from '@reduxjs/toolkit';

import type { Download } from '../types/Download';

export const created = createAction(
  'download/created',
  (download: Download) => ({
    payload: {
      download,
    },
  })
);

export const updated = createAction(
  'download/updated',
  (itemId: Download['itemId'], changes: Partial<Omit<Download, 'itemId'>>) => ({
    payload: {
      itemId,
      changes,
    },
  })
);

export const shownInFolder = createAction(
  'download/shownInFolder',
  (itemId: Download['itemId']) => ({
    payload: {
      itemId,
    },
  })
);

export const linkCopied = createAction(
  'download/linkCopied',
  (itemId: Download['itemId']) => ({
    payload: {
      itemId,
    },
  })
);

export const paused = createAction(
  'download/paused',
  (itemId: Download['itemId']) => ({
    payload: {
      itemId,
    },
  })
);

export const resumed = createAction(
  'download/resumed',
  (itemId: Download['itemId']) => ({
    payload: {
      itemId,
    },
  })
);

export const cancelled = createAction(
  'download/cancelled',
  (itemId: Download['itemId']) => ({
    payload: {
      itemId,
    },
  })
);

export const retried = createAction(
  'download/retried',
  (itemId: Download['itemId']) => ({
    payload: {
      itemId,
    },
  })
);

export const removed = createAction(
  'download/removed',
  (itemId: Download['itemId']) => ({
    payload: {
      itemId,
    },
  })
);
