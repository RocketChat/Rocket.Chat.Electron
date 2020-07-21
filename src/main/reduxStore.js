import { forwardToRenderer, triggerAlias, replayActionMain } from 'electron-redux';
import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { rootReducer } from '../reducers';
import { rootSaga } from './sagas';

export const setupReduxStore = () => {
	const sagaMiddleware = createSagaMiddleware();
	const middlewares = applyMiddleware(triggerAlias, sagaMiddleware, forwardToRenderer);
	const store = createStore(rootReducer, {}, middlewares);
	replayActionMain(store);

	sagaMiddleware.setContext({ store });
	sagaMiddleware.run(rootSaga);
};
