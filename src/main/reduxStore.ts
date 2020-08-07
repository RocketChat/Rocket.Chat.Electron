import { applyMiddleware, createStore, Store } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { forwardToRenderers } from '../ipc';
import { rootReducer } from '../reducers';
import { rootSaga } from './rootSaga';

export const createReduxStore = (): Store<any> => {
	const sagaMiddleware = createSagaMiddleware();
	const middlewares = applyMiddleware(sagaMiddleware, forwardToRenderers);
	const reduxStore = createStore(rootReducer, {}, middlewares);
	sagaMiddleware.run(rootSaga, reduxStore);
	return reduxStore;
};
