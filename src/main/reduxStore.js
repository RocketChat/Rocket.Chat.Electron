import { forwardToRenderer, triggerAlias, replayActionMain } from 'electron-redux';
import { createStore, applyMiddleware } from 'redux';

import { rootReducer } from '../reducers';

export const createReduxStore = () => {
	const middlewares = applyMiddleware(triggerAlias, forwardToRenderer);
	const reduxStore = createStore(rootReducer, {}, middlewares);
	replayActionMain(reduxStore);
	return reduxStore;
};
