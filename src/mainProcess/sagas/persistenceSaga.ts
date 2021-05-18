import { delay, takeLatest } from 'redux-saga/effects';

import { call } from '../../common/effects/call';
import { select } from '../../common/effects/select';
import { selectPersistableValues } from '../../common/selectPersistableValues';
import { persistValues } from '../persistValues';

export function* persistenceSaga(): Generator {
  yield takeLatest('*', function* () {
    const persistableValues = yield* select(selectPersistableValues);
    yield* call(persistValues, persistableValues);
    yield delay(70);
  });
}
