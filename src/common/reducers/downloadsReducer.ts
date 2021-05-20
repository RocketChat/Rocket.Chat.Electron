import { createReducer } from '@reduxjs/toolkit';

import * as downloadActions from '../actions/downloadActions';
import type { Download } from '../types/Download';

type State = Record<Download['itemId'], Download>;

export const downloadsReducer = createReducer<State>({}, (builder) =>
  builder
    .addCase(downloadActions.created, (state, action) => {
      const { download } = action.payload;

      state[download.itemId] = download;
    })
    .addCase(downloadActions.updated, (state, action) => {
      const { itemId, changes } = action.payload;

      state[itemId] = {
        ...state[itemId],
        ...changes,
      };
    })
    .addCase(downloadActions.removed, (state, action) => {
      const { itemId } = action.payload;

      delete state[itemId];
    })
);
