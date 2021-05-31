import { takeEvery } from 'redux-saga/effects';

import * as updateActions from '../../common/actions/updateActions';
import * as updateCheckActions from '../../common/actions/updateCheckActions';
import { call } from '../../common/effects/call';
import { put } from '../../common/effects/put';
import { select } from '../../common/effects/select';
import type { RootState } from '../../common/types/RootState';
import {
  askUpdateInstall,
  AskUpdateInstallResponse,
  warnAboutInstallUpdateLater,
  warnAboutUpdateDownload,
  warnAboutUpdateSkipped,
} from '../dialogs';
import {
  attachUpdatesEvents,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
} from '../updates';

function* updateCheckRequested() {
  yield* call(checkForUpdates);
}

function* updateDownloaded() {
  const response = yield* call(askUpdateInstall);

  if (response === AskUpdateInstallResponse.INSTALL_LATER) {
    yield* call(warnAboutInstallUpdateLater);
    return;
  }

  yield* call(installUpdate);
}

function* newVersionSkipped(
  action: ReturnType<typeof updateCheckActions.newVersionSkipped>
) {
  const { version } = action.payload;
  yield* call(warnAboutUpdateSkipped);
  yield* put(updateActions.skipped(version));
}

function* downloading() {
  yield* call(warnAboutUpdateDownload);
  yield* call(downloadUpdate);
}

export function* updatesSaga(): Generator {
  const allowed = yield* select((state: RootState) => state.updates.allowed);
  const enabled = yield* select(
    (state: RootState) => state.updates.settings.enabled
  );

  if (!allowed || !enabled) {
    return;
  }

  yield takeEvery(updateCheckActions.requested.match, updateCheckRequested);
  yield takeEvery(updateActions.downloaded.match, updateDownloaded);
  yield takeEvery(
    updateCheckActions.newVersionSkipped.match,
    newVersionSkipped
  );
  yield takeEvery(updateActions.downloading.match, downloading);

  yield* call(attachUpdatesEvents);

  const checkOnStartup = yield* select(
    (state: RootState) => state.updates.settings.checkOnStartup
  );

  if (checkOnStartup) {
    yield* call(checkForUpdates);
  }
}
