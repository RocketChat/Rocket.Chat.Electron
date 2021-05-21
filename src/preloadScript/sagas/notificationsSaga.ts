import { takeEvery } from 'redux-saga/effects';

import * as notificationActions from '../../common/actions/notificationActions';
import * as rootWindowActions from '../../common/actions/rootWindowActions';
import * as viewActions from '../../common/actions/viewActions';
import { call } from '../../common/effects/call';
import { put } from '../../common/effects/put';
import { triggerNotificationEvent } from '../notifications';

export function* notificationsSaga(serverUrl: string): Generator {
  yield takeEvery(notificationActions.shown.match, function* (action) {
    const { id } = action.payload;
    yield* call(triggerNotificationEvent, id, { type: 'show' });
  });

  yield takeEvery(notificationActions.closed.match, function* (action) {
    const { id } = action.payload;
    yield* call(triggerNotificationEvent, id, { type: 'close' });
  });

  yield takeEvery(notificationActions.clicked.match, function* (action) {
    const { id } = action.payload;

    yield* put(rootWindowActions.focused());
    yield* put(
      viewActions.changed({
        url: serverUrl,
      })
    );

    yield* call(triggerNotificationEvent, id, { type: 'click' });
  });

  yield takeEvery(notificationActions.replied.match, function* (action) {
    const { id, reply } = action.payload;
    yield* call(triggerNotificationEvent, id, {
      type: 'reply',
      detail: { reply },
    });
  });

  yield takeEvery(notificationActions.actioned.match, function* (action) {
    const { id, index } = action.payload;
    yield* call(triggerNotificationEvent, id, {
      type: 'action',
      detail: { index },
    });
  });
}
