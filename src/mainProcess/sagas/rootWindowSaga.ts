import { takeLatest } from 'redux-saga/effects';

import * as rootWindowActions from '../../common/actions/rootWindowActions';
import { call } from '../../common/effects/call';
import { watch } from '../../common/effects/watch';
import { getRootWindow } from '../rootWindow';

export function* rootWindowSaga(): Generator {
  yield takeLatest(rootWindowActions.focused.match, function* () {
    const rootWindow = yield* call(getRootWindow);
    rootWindow.show();
  });

  yield takeLatest(
    rootWindowActions.fullscreenToggled.match,
    function* (action) {
      const { enabled } = action.payload;
      const rootWindow = yield* call(getRootWindow);
      rootWindow.setFullScreen(enabled);
    }
  );

  yield takeLatest(rootWindowActions.zoomReset.match, function* () {
    const rootWindow = yield* call(getRootWindow);
    rootWindow.webContents.zoomLevel = 0;
  });

  yield takeLatest(rootWindowActions.zoomedIn.match, function* () {
    const rootWindow = yield* call(getRootWindow);
    if (rootWindow.webContents.zoomLevel >= 9) {
      return;
    }
    rootWindow.webContents.zoomLevel++;
  });

  yield takeLatest(rootWindowActions.zoomedOut.match, function* () {
    const rootWindow = yield* call(getRootWindow);
    if (rootWindow.webContents.zoomLevel <= -9) {
      return;
    }
    rootWindow.webContents.zoomLevel--;
  });

  yield takeLatest(rootWindowActions.reloaded.match, function* () {
    const rootWindow = yield* call(getRootWindow);
    rootWindow.webContents.reload();
  });

  yield takeLatest(rootWindowActions.toggled.match, function* () {
    const rootWindow = yield* call(getRootWindow);

    if (rootWindow.isVisible()) {
      rootWindow.hide();
    } else {
      rootWindow.show();
    }
  });

  yield* watch(
    (state) => state.ui.rootWindow.devToolsOpen,
    function* (open) {
      const rootWindow = yield* call(getRootWindow);

      if (open) {
        rootWindow.webContents.openDevTools();
      } else {
        rootWindow.webContents.closeDevTools();
      }
    }
  );
}
