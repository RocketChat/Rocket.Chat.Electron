import { configureStore, Store } from '@reduxjs/toolkit';

import { catchLastAction } from '../common/catchLastAction';
import { rootReducer } from '../common/reducers';
import type { RootState } from '../common/types/RootState';
import { forwardToRenderers } from './forwardToRenderers';
import { getPreloadedState } from './getPreloadedState';

export const createMainReduxStore = async (): Promise<Store<RootState>> =>
  configureStore({
    reducer: rootReducer,
    preloadedState: await getPreloadedState(),
    middleware: [catchLastAction, forwardToRenderers],
  });
