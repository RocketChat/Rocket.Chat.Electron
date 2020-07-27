import { fork, select, take, call } from 'redux-saga/effects';

function *watchValueSaga(selector, saga) {
	let prevValue;
	do {
		const value = yield select(selector);
		if (!Object.is(value, prevValue)) {
			yield *saga([value, prevValue]);
			prevValue = value;
		}
		yield take();
	} while (true);
}

export const watchValue = (selector, saga) => fork(watchValueSaga, selector, saga);

function *waitAndCleanUpSaga(cleanUp) {
	try {
		while (true) {
			yield take();
		}
	} finally {
		yield call(cleanUp);
	}
}

export const waitAndCleanUp = (cleanUp) => call(waitAndCleanUpSaga, cleanUp);
