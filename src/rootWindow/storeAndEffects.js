import { forwardToMain, replayActionRenderer, getInitialStateRenderer } from 'electron-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { rootReducer } from '../reducers';

export const createReduxStoreAndSagaMiddleware = () => {
	const sagaMiddleware = createSagaMiddleware();
	const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
	const store = createStore(
		rootReducer,
		getInitialStateRenderer(),
		composeEnhancers(applyMiddleware(forwardToMain, sagaMiddleware)),
	);

	replayActionRenderer(store);

	return [store, sagaMiddleware];
};
