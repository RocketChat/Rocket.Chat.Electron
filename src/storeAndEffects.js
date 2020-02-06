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
import { deepLinksSaga } from './sagas/deepLinks';
import { navigationEventsSaga } from './sagas/navigationEvents';
import { serversSaga } from './sagas/servers';
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
