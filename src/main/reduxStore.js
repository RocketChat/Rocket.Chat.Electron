import { forwardToRenderer, triggerAlias, replayActionMain } from 'electron-redux';
import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { rootReducer } from '../reducers';

let resolveStore = () => undefined;
let resolveSagaMiddleware = () => undefined;

const deferredStore = new Promise((resolve) => {
	resolveStore = resolve;
});

const deferredSagaMiddleware = new Promise((resolve) => {
	resolveSagaMiddleware = resolve;
});

export const setupReduxStore = () => {
	const sagaMiddleware = createSagaMiddleware();
	const middlewares = applyMiddleware(triggerAlias, sagaMiddleware, forwardToRenderer);
	const store = createStore(rootReducer, {}, middlewares);
	replayActionMain(store);

	resolveStore(store);
	resolveSagaMiddleware(sagaMiddleware);
};

export const dispatch = (action) => deferredStore.then((store) => store.dispatch(action));

export const runSaga = (saga, ...args) =>
	deferredSagaMiddleware.then((sagaMiddleware) =>
		sagaMiddleware.run(saga, ...args),
	);
