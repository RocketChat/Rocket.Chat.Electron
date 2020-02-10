import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { deepLinksSaga } from './sagas/deepLinks';
import { navigationEventsSaga } from './sagas/navigationEvents';
import { serversSaga } from './sagas/servers';
import { spellCheckingSaga } from './sagas/spellChecking';
import { updatesSaga } from './sagas/updates';
import { rootReducer } from './reducers';

function *rootSaga() {
	yield fork(deepLinksSaga);
	yield fork(navigationEventsSaga);
	yield fork(serversSaga);
	yield fork(spellCheckingSaga);
	yield fork(updatesSaga);
}

// const logger = () => (next) => (action) => {
// 	console.log(action.type, action.payload);
// 	return next(action);
// };

export const createReduxStoreAndSagaMiddleware = () => {
	const sagaMiddleware = createSagaMiddleware();
	const store = createStore(rootReducer, {}, applyMiddleware(sagaMiddleware/* , logger*/));
	sagaMiddleware.run(rootSaga);

	return [store, sagaMiddleware];
};
