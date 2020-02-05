import { createStore, applyMiddleware, combineReducers } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { fork } from 'redux-saga/effects';

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
import { certificatesSaga } from './sagas/certificates';
import { spellCheckingSaga } from './sagas/spellChecking';
import { updatesSaga } from './sagas/updates';

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

function *rootSaga() {
	yield fork(certificatesSaga);
	yield fork(spellCheckingSaga);
	yield fork(updatesSaga);
}

export const sagaMiddleware = createSagaMiddleware();

// const logger = () => (next) => (action) => {
// 	console.log(action.type, action.payload);
// 	return next(action);
// };

export const store = createStore(rootReducer, {}, applyMiddleware(sagaMiddleware/* , logger*/));
sagaMiddleware.run(rootSaga);
