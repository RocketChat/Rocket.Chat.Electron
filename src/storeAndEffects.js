import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { rootReducer } from './reducers';

// const logger = () => (next) => (action) => {
// 	console.log(action.type, action.payload);
// 	return next(action);
// };

export const createReduxStoreAndSagaMiddleware = () => {
	const sagaMiddleware = createSagaMiddleware();
	const store = createStore(rootReducer, {}, applyMiddleware(sagaMiddleware/* , logger*/));

	return [store, sagaMiddleware];
};
