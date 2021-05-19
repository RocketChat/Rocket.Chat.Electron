import { fork } from 'redux-saga/effects';

import { persistenceSaga } from './persistenceSaga';
import { rootWindowSaga } from './rootWindowSaga';
import { updatesSaga } from './updatesSaga';
import { userPresenceSaga } from './userPresenceSaga';

export function* rootSaga(): Generator {
  yield fork(persistenceSaga);
  yield fork(rootWindowSaga);
  yield fork(updatesSaga);
  yield fork(userPresenceSaga);
}
