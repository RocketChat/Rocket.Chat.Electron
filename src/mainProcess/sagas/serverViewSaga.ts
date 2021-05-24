import { takeEvery } from 'redux-saga/effects';

import * as certificatesActions from '../../common/actions/certificatesActions';
import * as serverActions from '../../common/actions/serverActions';
import { call } from '../../common/effects/call';
import {
  attachServerView,
  getAllServerWebContents,
  getWebContentsByServerUrl,
  triggerPopup,
} from '../serverView';

export function* serverViewSaga(): Generator {
  yield takeEvery(certificatesActions.cleared.match, function* () {
    for (const webContents of getAllServerWebContents()) {
      webContents.reloadIgnoringCache();
    }
  });

  yield takeEvery(serverActions.reloaded.match, function* (action) {
    const { url } = action.payload;
    const webContents = yield* call(getWebContentsByServerUrl, url);
    webContents?.loadURL(url);
  });

  yield takeEvery(serverActions.popupTriggered.match, function* (action) {
    const { url } = action.payload;
    yield* call(triggerPopup, url);
  });

  yield takeEvery(serverActions.webviewAttached.match, function* (action) {
    const { url, webContentsId } = action.payload;
    yield* call(attachServerView, url, webContentsId);
  });
}
