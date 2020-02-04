import { createStore, applyMiddleware, combineReducers } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { currentServerUrl } from './reducers/currentServerUrl';
import { doCheckForUpdatesOnStartup } from './reducers/doCheckForUpdatesOnStartup';
import { isCheckingForUpdates } from './reducers/isCheckingForUpdates';
import { isEachUpdatesSettingConfigurable } from './reducers/isEachUpdatesSettingConfigurable';
import { isUpdatingAllowed } from './reducers/isUpdatingAllowed';
import { isUpdatingEnabled } from './reducers/isUpdatingEnabled';
import { servers } from './reducers/servers';
import { skippedUpdateVersion } from './reducers/skippedUpdateVersion';
import { spellCheckingDictionaries } from './reducers/spellCheckingDictionaries';

const rootReducer = combineReducers({
	currentServerUrl,
	doCheckForUpdatesOnStartup,
	isCheckingForUpdates,
	isEachUpdatesSettingConfigurable,
	isUpdatingAllowed,
	isUpdatingEnabled,
	servers,
	spellCheckingDictionaries,
	skippedUpdateVersion,
});

export const sagaMiddleware = createSagaMiddleware();

// const logger = () => (next) => (action) => {
// 	console.log(action.type, action.payload);
// 	return next(action);
// };

export const store = createStore(rootReducer, {}, applyMiddleware(sagaMiddleware/* , logger*/));
