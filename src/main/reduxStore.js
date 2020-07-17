import { forwardToRenderer, triggerAlias, replayActionMain } from 'electron-redux';
import { createStore, applyMiddleware } from 'redux';

import { rootReducer } from '../reducers';

const store = createStore(rootReducer, {}, applyMiddleware(triggerAlias, forwardToRenderer));

export const setupReduxStore = () => {
	replayActionMain(store);
};
