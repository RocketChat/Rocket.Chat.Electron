import { createStore, applyMiddleware, combineReducers } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { currentServerUrl } from './reducers/currentServerUrl';
import { doCheckForUpdatesOnStartup } from './reducers/doCheckForUpdatesOnStartup';
import { installedSpellCheckingDictionariesDirectoryPath } from './reducers/installedSpellCheckingDictionariesDirectoryPath';
import { isCheckingForUpdates } from './reducers/isCheckingForUpdates';
import { isEachUpdatesSettingConfigurable } from './reducers/isEachUpdatesSettingConfigurable';
import { isHunspellSpellCheckerUsed } from './reducers/isHunspellSpellCheckerUsed';
import { isUpdatingAllowed } from './reducers/isUpdatingAllowed';
import { isUpdatingEnabled } from './reducers/isUpdatingEnabled';
import { servers } from './reducers/servers';
import { skippedUpdateVersion } from './reducers/skippedUpdateVersion';
import { spellCheckingDictionaries } from './reducers/spellCheckingDictionaries';

const rootReducer = combineReducers({
	currentServerUrl,
	doCheckForUpdatesOnStartup,
	installedSpellCheckingDictionariesDirectoryPath,
	isCheckingForUpdates,
	isEachUpdatesSettingConfigurable,
	isHunspellSpellCheckerUsed,
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
