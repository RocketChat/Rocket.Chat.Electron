import { createStore, applyMiddleware, combineReducers } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { takeEvery } from 'redux-saga/effects';

import { spellCheckingDictionaries } from './reducers/spellCheckingDictionaries';

const rootReducer = combineReducers({
	spellCheckingDictionaries,
});

export const sagaMiddleware = createSagaMiddleware();

export const store = createStore(rootReducer, {}, applyMiddleware(sagaMiddleware));

export const dispatch = (action) => {
	store.dispatch(action);
};

export const subscribe = (handler) => {
	const task = sagaMiddleware.run(function *() {
		yield takeEvery('*', function *(action) {
			handler(action);
		});
	});

	const unsubscribe = () => {
		task.cancel();
	};

	window.addEventListener('beforeunload', unsubscribe);

	return unsubscribe;
};
