import { forwardToRenderer, triggerAlias, replayActionMain } from 'electron-redux';
import { createStore, applyMiddleware, Store } from 'redux';

import { rootReducer } from '../reducers';

export const createReduxStore = (): Store<any> => {
	const middlewares = applyMiddleware(triggerAlias, forwardToRenderer);
	const reduxStore = createStore(rootReducer, {}, middlewares);
	replayActionMain(reduxStore);
	return reduxStore;
};
