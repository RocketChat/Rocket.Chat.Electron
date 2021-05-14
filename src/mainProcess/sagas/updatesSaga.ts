import { call, put, select, takeEvery } from 'redux-saga/effects';

import type { ActionOf } from '../../common/actions';
import {
  UPDATE_DIALOG_INSTALL_BUTTON_CLICKED,
  UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
} from '../../common/actions/uiActions';
import * as updateActions from '../../common/actions/updateActions';
import * as updateCheckActions from '../../common/actions/updateCheckActions';
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
  yield call(checkForUpdates);
}

function* updateDownloaded() {
  const response = (yield call(askUpdateInstall)) as AskUpdateInstallResponse;

  if (response === AskUpdateInstallResponse.INSTALL_LATER) {
    yield call(warnAboutInstallUpdateLater);
    return;
  }

  yield call(installUpdate);
}

function* skipButtonClicked(
  action: ActionOf<typeof UPDATE_DIALOG_SKIP_UPDATE_CLICKED>
) {
  yield call(warnAboutUpdateSkipped);
  yield put(updateActions.skipped(action.payload));
}

function* installButtonClicked() {
  yield call(warnAboutUpdateDownload);
  yield call(downloadUpdate);
}

export function* updatesSaga(): Generator {
  const allowed = (yield select(
    (state: RootState) => state.updates.allowed
  )) as boolean;
  const enabled = (yield select(
    (state: RootState) => state.updates.settings.enabled
  )) as boolean;

  if (!allowed || !enabled) {
    return;
  }

  yield takeEvery(updateCheckActions.requested.match, updateCheckRequested);
  yield takeEvery(updateActions.downloaded.match, updateDownloaded);
  yield takeEvery(UPDATE_DIALOG_SKIP_UPDATE_CLICKED, skipButtonClicked);
  yield takeEvery(UPDATE_DIALOG_INSTALL_BUTTON_CLICKED, installButtonClicked);

  yield call(attachUpdatesEvents);

  const checkOnStartup = (yield select(
    (state: RootState) => state.updates.settings.checkOnStartup
  )) as boolean;

  if (checkOnStartup) {
    yield call(checkForUpdates);
  }
}
