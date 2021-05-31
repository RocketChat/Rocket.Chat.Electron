import { configureStore, Store } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';

import { rootReducer } from '../common/reducers';
import type { RootState } from '../common/types/RootState';
import { forwardToRenderers } from './forwardToRenderers';
import { getPreloadedState } from './getPreloadedState';

export const createMainReduxStore = async <
  GF extends (...args: any[]) => Generator
>(
  rootSaga?: GF,
  ...args: Parameters<GF>
): Promise<Store<RootState>> => {
  const sagaMiddleware = createSagaMiddleware();

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: await getPreloadedState(),
    middleware: [sagaMiddleware, forwardToRenderers],
  });

  if (rootSaga) {
    setTimeout(() => {
      sagaMiddleware.run(rootSaga, ...args);
    }, 0);
  }

  return store;
};
