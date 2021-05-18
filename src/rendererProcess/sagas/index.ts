import type { StrictEffect } from 'redux-saga/effects';

import { fork } from '../../common/effects/fork';
import { rootWindowIconSaga } from './rootWindowIconSaga';

export function* rootSaga(): Generator<StrictEffect, void> {
  yield* fork(rootWindowIconSaga);
}
