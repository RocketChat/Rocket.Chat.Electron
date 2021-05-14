import { fork } from 'redux-saga/effects';

import { updatesSaga } from './updatesSaga';

export function* rootSaga(): Generator {
  yield fork(updatesSaga);
}
