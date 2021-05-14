import { applyMiddleware, createStore, Store, compose } from 'redux';

import { catchLastAction } from '../common/catchLastAction';
import { rootReducer } from '../common/reducers';
import { forwardToMain } from './forwardToMain';
import { getCurrentState } from './getCurrentState';

export const createRendererReduxStore = async (): Promise<Store> => {
  const preloadedState = await getCurrentState();
  const composeEnhancers: typeof compose =
    (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const enhancers = composeEnhancers(
    applyMiddleware(forwardToMain, catchLastAction)
  );

  return createStore(rootReducer, preloadedState, enhancers);
};
