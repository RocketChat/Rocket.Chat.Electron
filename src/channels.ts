import { channel, stdChannel } from 'redux-saga';
import { takeEvery, put, Effect } from 'redux-saga/effects';

import { FluxStandardAction } from './structs/fsa';

export type RequestAction<P> = FluxStandardAction<string, P> & {
  payload: P;
  meta: {
    request: true;
    id: string;
  }
};

export const isRequest = (action: FluxStandardAction<string, unknown>): action is RequestAction<unknown> =>
	(action as RequestAction<unknown>)?.meta?.request;

export type ResponseAction<P> = FluxStandardAction<string, P> & {
  payload: P;
  meta: {
    response: true;
    id: string;
  }
};

export const isResponse = (action: FluxStandardAction<string, unknown>): action is ResponseAction<unknown> =>
	(action as ResponseAction<unknown>)?.meta?.response;

export const requestsChannel = channel<RequestAction<unknown>>();
export const responsesChannel = stdChannel<ResponseAction<unknown>>();

export function *takeRequests(): Generator<Effect, void> {
  yield takeEvery(requestsChannel, function *(action: RequestAction<unknown>) {
    yield put(action);
  });

  yield takeEvery(isResponse, function *(action) {
    yield put(responsesChannel, action);
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
