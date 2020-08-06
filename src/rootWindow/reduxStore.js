import { forwardToMain, replayActionRenderer, getInitialStateRenderer } from 'electron-redux';
import { createStore, applyMiddleware, compose } from 'redux';

import { rootReducer } from '../reducers';

export const createReduxStore = () => {
	const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
	const reduxStore = createStore(
		rootReducer,
		getInitialStateRenderer(),
		composeEnhancers(applyMiddleware(forwardToMain)),
	);
	replayActionRenderer(reduxStore);
	return reduxStore;
};
