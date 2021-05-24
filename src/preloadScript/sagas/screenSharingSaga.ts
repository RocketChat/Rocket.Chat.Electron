import { takeEvery } from 'redux-saga/effects';

import * as screenSharingActions from '../../common/actions/screenSharingActions';
import { call } from '../../common/effects/call';
import {
  attachScreenSharingEvents,
  notifyScreenSharingSource,
  rejectScreenSharingRequest,
} from '../screenSharing';

export function* screenSharingSaga(): Generator {
  yield takeEvery(
    screenSharingActions.sourceSelected.match,
    function* (action) {
      const sourceId = action.payload;
      yield* call(notifyScreenSharingSource, sourceId);
    }
  );

  yield takeEvery(screenSharingActions.sourceDenied.match, function* () {
    yield* call(rejectScreenSharingRequest);
  });

  yield* call(attachScreenSharingEvents);
}
