import { configureStore, Store } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';

import { rootReducer } from '../common/reducers';
import type { RootState } from '../common/types/RootState';
import { forwardToMain } from './forwardToMain';
import { getCurrentState } from './getCurrentState';

export const createRendererReduxStore = async <
  GF extends (...args: any[]) => Generator
>(
  rootSaga?: GF,
  ...args: Parameters<GF>
): Promise<Store<RootState>> => {
  const sagaMiddleware = createSagaMiddleware();
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: await getCurrentState(),
    middleware: [forwardToMain, sagaMiddleware],
  });

  if (rootSaga) {
    sagaMiddleware.run(rootSaga, ...args);
  }

  return store;
};
