import { powerMonitor } from 'electron';
import { takeEvery, call, put, Effect } from 'redux-saga/effects';

import {
  SYSTEM_SUSPENDING,
  SYSTEM_LOCKING_SCREEN,
  SYSTEM_IDLE_STATE_REQUESTED,
  SYSTEM_IDLE_STATE_RESPONDED,
} from '../actions';
import { dispatch, RequestAction } from '../channels';

export const setupPowerMonitor = (): void => {
  powerMonitor.addListener('suspend', () => {
    dispatch({ type: SYSTEM_SUSPENDING });
  });

  powerMonitor.addListener('lock-screen', () => {
    dispatch({ type: SYSTEM_LOCKING_SCREEN });
  });
};

export function *takeSystemActions(): Generator<Effect> {
  yield takeEvery(SYSTEM_IDLE_STATE_REQUESTED, function *(action: RequestAction<number>) {
    const { meta: { id }, payload: idleThreshold } = action;
    const idleState = yield call(() => powerMonitor.getSystemIdleState(idleThreshold));
    const responseAction = {
      type: SYSTEM_IDLE_STATE_RESPONDED,
      payload: idleState,
      meta: {
        response: true,
        id,
      },
    };
    yield put(responseAction);
  });
}
