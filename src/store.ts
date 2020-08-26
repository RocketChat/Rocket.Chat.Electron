import { applyMiddleware, createStore, Store, compose } from 'redux';
import createSagaMiddleware, { Saga } from 'redux-saga';

import { forwardToRenderers, getInitialState, forwardToMain } from './ipc';
import { rootReducer } from './reducers';

type RootState = ReturnType<typeof rootReducer>;

let reduxStore: Store<RootState>;

export const getReduxStore = (): Store<RootState> =>
  reduxStore;

export const createMainReduxStore = (rootSaga: Saga): void => {
  const sagaMiddleware = createSagaMiddleware();
  const middlewares = applyMiddleware(sagaMiddleware, forwardToRenderers);

  reduxStore = createStore(rootReducer, {}, middlewares);

  sagaMiddleware.run(rootSaga, reduxStore);
};

export const createRendererReduxStore = async (rootSaga: Saga): Promise<void> => {
  const sagaMiddleware = createSagaMiddleware();
  const initialState = await getInitialState();
  const composeEnhancers: typeof compose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const enhancers = composeEnhancers(applyMiddleware(forwardToMain, sagaMiddleware));

  reduxStore = createStore(rootReducer, initialState, enhancers);

  sagaMiddleware.run(rootSaga, reduxStore);
};
