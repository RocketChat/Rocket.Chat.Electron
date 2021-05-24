import { takeEvery } from 'redux-saga/effects';

import * as certificatesActions from '../../common/actions/certificatesActions';
import { getAllServerWebContents } from '../serverView';

export function* serverViewSaga(): Generator {
  yield takeEvery(certificatesActions.cleared.match, function* () {
    for (const webContents of getAllServerWebContents()) {
      webContents.reloadIgnoringCache();
    }
  });
}
