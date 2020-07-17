import { forwardToMain, replayActionRenderer, getInitialStateRenderer } from 'electron-redux';
import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { rootReducer } from './reducers';

// const logger = () => (next) => (action) => {
// 	console.log(action.type, action.payload);
// 	return next(action);
// };

export const createReduxStoreAndSagaMiddleware = () => {
	const sagaMiddleware = createSagaMiddleware();
	const store = createStore(
		rootReducer,
		getInitialStateRenderer(),
		applyMiddleware(forwardToMain, sagaMiddleware/* , logger*/),
	);

	replayActionRenderer(store);

	return [store, sagaMiddleware];
};
