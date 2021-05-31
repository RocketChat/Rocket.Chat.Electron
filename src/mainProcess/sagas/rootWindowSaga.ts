import { takeEvery, takeLatest } from 'redux-saga/effects';

import * as rootWindowActions from '../../common/actions/rootWindowActions';
import * as serverActions from '../../common/actions/serverActions';
import { call } from '../../common/effects/call';
import { watch } from '../../common/effects/watch';
import { getRootWindow } from '../rootWindow';
import { triggerSideBarPopup } from '../triggerSideBarPopup';

export function* rootWindowSaga(): Generator {
  const rootWindow = yield* call(getRootWindow);

  yield takeLatest(rootWindowActions.focused.match, function* () {
    rootWindow.show();
  });

  yield takeLatest(
    rootWindowActions.fullscreenToggled.match,
    function* (action) {
      const { enabled } = action.payload;
      rootWindow.setFullScreen(enabled);
    }
  );

  yield takeLatest(rootWindowActions.zoomReset.match, function* () {
    const rootWindow = yield* call(getRootWindow);
    rootWindow.webContents.zoomLevel = 0;
  });

  yield takeLatest(rootWindowActions.zoomedIn.match, function* () {
    if (rootWindow.webContents.zoomLevel >= 9) {
      return;
    }
    rootWindow.webContents.zoomLevel++;
  });

  yield takeLatest(rootWindowActions.zoomedOut.match, function* () {
    if (rootWindow.webContents.zoomLevel <= -9) {
      return;
    }
    rootWindow.webContents.zoomLevel--;
  });

  yield takeLatest(rootWindowActions.reloaded.match, function* () {
    rootWindow.webContents.reload();
  });

  yield takeLatest(rootWindowActions.toggled.match, function* () {
    if (rootWindow.isVisible()) {
      rootWindow.hide();
    } else {
      rootWindow.show();
    }
  });

  yield takeEvery(serverActions.popupTriggered.match, function* (action) {
    const { url } = action.payload;
    yield* call(triggerSideBarPopup, url);
  });

  yield* watch(
    (state) => state.ui.rootWindow.devToolsOpen,
    function* (open) {
      if (open) {
        rootWindow.webContents.openDevTools();
      } else {
        rootWindow.webContents.closeDevTools();
      }
    }
  );
}
