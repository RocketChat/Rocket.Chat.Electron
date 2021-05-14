import { applyMiddleware, createStore, Store } from 'redux';

import { catchLastAction } from '../common/catchLastAction';
import { rootReducer } from '../common/reducers';
import type { RootState } from '../common/types/RootState';
import { forwardToRenderers } from './forwardToRenderers';

export const createMainReduxStore = (): Store<RootState> => {
  const middlewares = applyMiddleware(catchLastAction, forwardToRenderers);

  return createStore(rootReducer, {}, middlewares);
};
