import { createStore, applyMiddleware, compose, Store } from 'redux';

import { getInitialState, forwardToMain } from '../ipc';
import { rootReducer } from '../reducers';

const composeEnhancers: typeof compose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const createReduxStore = async (): Promise<Store> => {
	const reduxStore = createStore(
		rootReducer,
		await getInitialState(),
		composeEnhancers(applyMiddleware(forwardToMain)),
	);
	return reduxStore;
};
