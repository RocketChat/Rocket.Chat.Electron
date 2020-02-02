import { createStore, applyMiddleware, combineReducers } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { checksForUpdatesOnStartup } from './reducers/checksForUpdatesOnStartup';
import { currentServerUrl } from './reducers/currentServerUrl';
import { servers } from './reducers/servers';
import { spellCheckingDictionaries } from './reducers/spellCheckingDictionaries';
import { updatesConfigurable } from './reducers/updatesConfigurable';
import { updatesEnabled } from './reducers/updatesEnabled';

const rootReducer = combineReducers({
	checksForUpdatesOnStartup,
	currentServerUrl,
	servers,
	spellCheckingDictionaries,
	updatesConfigurable,
	updatesEnabled,
});

export const sagaMiddleware = createSagaMiddleware();

// const logger = () => (next) => (action) => {
// 	console.log(action.type, action.payload);
// 	return next(action);
// };

export const store = createStore(rootReducer, {}, applyMiddleware(sagaMiddleware/* , logger*/));
