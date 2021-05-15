import { fork } from 'redux-saga/effects';

import { updatesSaga } from './updatesSaga';
import { userPresenceSaga } from './userPresenceSaga';

export function* rootSaga(): Generator {
  yield fork(updatesSaga);
  yield fork(userPresenceSaga);
}
