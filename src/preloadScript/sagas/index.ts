import { fork } from 'redux-saga/effects';

import { screenSharingSaga } from './screenSharingSaga';

export function* rootSaga(): Generator {
  yield fork(screenSharingSaga);
}
