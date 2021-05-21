import { takeEvery } from 'redux-saga/effects';

import * as notificationActions from '../../common/actions/notificationActions';
import { call } from '../../common/effects/call';
import { deleteNotification, upsertNotification } from '../notifications';

export function* notificationsSaga(): Generator {
  yield takeEvery(notificationActions.created.match, function* (action) {
    const { options } = action.payload;
    yield* call(upsertNotification, options);
  });

  yield takeEvery(notificationActions.dismissed.match, function* (action) {
    const { id } = action.payload;
    yield* call(deleteNotification, id);
  });
}
