import { takeEvery } from 'redux-saga/effects';

import * as certificatesActions from '../../common/actions/certificatesActions';
import * as serverActions from '../../common/actions/serverActions';
import { call } from '../../common/effects/call';
import {
  getAllServerWebContents,
  getWebContentsByServerUrl,
  purgeSessionStorageData,
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

  yield takeEvery(serverActions.removed.match, function* (action) {
    const { url } = action.payload;
    yield* call(purgeSessionStorageData, url);
  });
}
