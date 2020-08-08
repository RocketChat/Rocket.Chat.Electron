import { AnyAction } from 'redux';
import { channel, stdChannel } from 'redux-saga';
import { takeEvery, put, Effect } from 'redux-saga/effects';

export type RequestAction<P> = AnyAction & {
	payload: P;
	meta: {
		request: true;
		id: string;
	}
};

export const isRequest = (action: AnyAction): action is RequestAction<unknown> => action?.meta?.request;

export type ResponseAction<P> = AnyAction & {
	payload: P;
	meta: {
		response: true;
		id: string;
	}
};

export const isResponse = (action: AnyAction): action is RequestAction<unknown> => action?.meta?.response;

export const requestsChannel = channel<RequestAction<unknown>>();
export const responsesChannel = stdChannel<ResponseAction<unknown>>();
export const actionsChannel = channel<AnyAction>();

export function *takeRequests(): Generator<Effect> {
	yield takeEvery(requestsChannel, function *(action: AnyAction) {
		yield put(action);
	});

	yield takeEvery(isResponse, function *(action) {
		yield put(responsesChannel, action);
	});

	yield takeEvery(actionsChannel, function *(action: AnyAction) {
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

export const dispatch = (action: AnyAction): void => {
	actionsChannel.put(action);
};
