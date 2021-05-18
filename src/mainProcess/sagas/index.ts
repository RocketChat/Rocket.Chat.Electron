import { fork } from 'redux-saga/effects';

import { persistenceSaga } from './persistenceSaga';
import { updatesSaga } from './updatesSaga';
import { userPresenceSaga } from './userPresenceSaga';

export function* rootSaga(): Generator {
  yield fork(updatesSaga);
  yield fork(userPresenceSaga);
  yield fork(persistenceSaga);
}
