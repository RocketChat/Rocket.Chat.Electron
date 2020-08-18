import { createStore, applyMiddleware, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { getInitialState, forwardToMain } from '../ipc';
import { rootReducer } from '../reducers';
import { rootSaga } from './rootSaga';

export const createReduxStore = async (): Promise<void> => {
	const sagaMiddleware = createSagaMiddleware();

	const initialState = await getInitialState();
	const composeEnhancers: typeof compose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
	const enhancers = composeEnhancers(applyMiddleware(forwardToMain, sagaMiddleware));

	createStore(rootReducer, initialState, enhancers);

	sagaMiddleware.run(rootSaga);
};
