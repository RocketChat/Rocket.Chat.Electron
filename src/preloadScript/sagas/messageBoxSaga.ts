import { takeEvery } from 'redux-saga/effects';

import * as messageBoxActions from '../../common/actions/messageBoxActions';
import { call } from '../../common/effects/call';
import {
  attachMessageBoxEvents,
  triggerMessageBoxFormatButton,
} from '../messageBox';

export function* messageBoxSaga(): Generator {
  yield takeEvery(
    messageBoxActions.formatButtonClicked.match,
    function* (action) {
      const { buttonId } = action.payload;
      yield* call(triggerMessageBoxFormatButton, buttonId);
    }
  );

  yield* call(attachMessageBoxEvents);
}
