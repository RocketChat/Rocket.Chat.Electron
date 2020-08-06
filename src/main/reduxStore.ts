import { applyMiddleware, createStore, Store } from 'redux';

import { forwardToRenderers } from '../ipc';
import { rootReducer } from '../reducers';

export const createReduxStore = (): Store<any> => {
	const middlewares = applyMiddleware(forwardToRenderers);
	const reduxStore = createStore(rootReducer, {}, middlewares);
	return reduxStore;
};
