import { Effect, fork, select, call, take, ForkEffect } from 'redux-saga/effects';

export const selectChanges = <V>(
	selector: (state: any) => V,
	saga: (value: V, prevValue: V) => Generator,
): ForkEffect<never> => {
	const initialValue = Symbol('initial');
	let prevValue: V | symbol = initialValue;

	return fork(function *watchChanges(): Generator<Effect, never> {
		while (true) {
			const value: V = (yield select(selector)) as V;

			if (Object.is(prevValue, value)) {
				yield take();
				continue;
			}

			prevValue = value;

			yield call(saga, value, prevValue);

			yield take();
		}
	});
};
