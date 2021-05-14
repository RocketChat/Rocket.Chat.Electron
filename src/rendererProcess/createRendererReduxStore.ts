import { configureStore, Store } from '@reduxjs/toolkit';

import { catchLastAction } from '../common/catchLastAction';
import { rootReducer } from '../common/reducers';
import type { RootState } from '../common/types/RootState';
import { forwardToMain } from './forwardToMain';
import { getCurrentState } from './getCurrentState';

export const createRendererReduxStore = async (): Promise<Store<RootState>> =>
  configureStore({
    reducer: rootReducer,
    preloadedState: await getCurrentState(),
    middleware: [forwardToMain, catchLastAction],
  });
