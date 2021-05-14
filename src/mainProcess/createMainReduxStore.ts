import { applyMiddleware, createStore, Store } from 'redux';

import { catchLastAction } from '../common/catchLastAction';
import { rootReducer, RootState } from '../common/reducers';
import { forwardToRenderers } from './forwardToRenderers';

export const createMainReduxStore = (): Store<RootState> => {
  const middlewares = applyMiddleware(catchLastAction, forwardToRenderers);

  return createStore(rootReducer, {}, middlewares);
};
