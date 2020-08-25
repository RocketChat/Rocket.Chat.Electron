import { channel, stdChannel, EventChannel, eventChannel } from 'redux-saga';
import { takeEvery, put, Effect, take } from 'redux-saga/effects';

import { FluxStandardAction } from './structs/fsa';

export type RequestAction<P> = FluxStandardAction<P> & {
	payload: P;
	meta: {
		request: true;
		id: string;
	}
};

export const isRequest = (action: FluxStandardAction<unknown>): action is RequestAction<unknown> =>
	(action as RequestAction<unknown>)?.meta?.request;

export type ResponseAction<P> = FluxStandardAction<P> & {
	payload: P;
	meta: {
		response: true;
		id: string;
	}
};

export const isResponse = (action: FluxStandardAction<unknown>): action is ResponseAction<unknown> =>
	(action as ResponseAction<unknown>)?.meta?.response;

export const requestsChannel = channel<RequestAction<unknown>>();
export const responsesChannel = stdChannel<ResponseAction<unknown>>();
export const actionsChannel = channel<FluxStandardAction<unknown>>();

export function *takeRequests(): Generator<Effect, void> {
	yield takeEvery(requestsChannel, function *(action: RequestAction<unknown>) {
		yield put(action);
	});

	yield takeEvery(isResponse, function *(action) {
		yield put(responsesChannel, action);
	});

	yield takeEvery(actionsChannel, function *(action: FluxStandardAction<unknown>) {
		yield put(action);
	});
}

export const request = <P, RP>(actionType: string, payload: P): Promise<RP> =>
	new Promise<RP>((resolve, reject) => {
		const id = Math.random().toString(36).slice(2);

		const requestAction: RequestAction<P> = {
			type: actionType,
			payload,
			meta: {
				request: true,
				id,
			},
		};

		requestsChannel.put(requestAction);

		responsesChannel.take((action: ResponseAction<RP>) => {
			if (action.error) {
				reject(action.payload);
				return;
			}

			resolve(action.payload);
		}, (action) => action.meta.id === id);
	});

export function *putAndTake<P, RP>(actionType: string, payload: P): Generator<Effect, RP> {
	const id = Math.random().toString(36).slice(2);

	const requestAction: RequestAction<P> = {
		type: actionType,
		payload,
		meta: {
			request: true,
			id,
		},
	};

	yield put(requestAction);

	const action = (yield take((action: FluxStandardAction<RP>) => action.meta.id === id)) as ResponseAction<RP>;

	if (action.error) {
		throw action.payload;
	}

	return action.payload;
}

export const dispatch = (action: FluxStandardAction<unknown>): void => {
	actionsChannel.put(action);
};

export const eventTargetEvent = <E extends Event>(
	eventTarget: EventTarget,
	eventType: string,
	options?: boolean | AddEventListenerOptions,
): EventChannel<E> => eventChannel<E>((emit) => {
	const handle = (event: E): void => {
		emit(event);
	};

	eventTarget.addEventListener(eventType, handle, options);

	return () => {
		eventTarget.removeEventListener(eventType, handle, options);
	};
});
