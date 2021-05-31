import type { StrictEffect } from 'redux-saga/effects';

import { fork } from '../../common/effects/fork';
import { errorHandlingSaga } from './errorHandlingSaga';
import { rootWindowIconSaga } from './rootWindowIconSaga';

export function* rootSaga(): Generator<StrictEffect, void> {
  yield* fork(errorHandlingSaga);
  yield* fork(rootWindowIconSaga);
}
