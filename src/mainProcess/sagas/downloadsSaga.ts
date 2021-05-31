import { takeLatest } from 'redux-saga/effects';

import * as downloadActions from '../../common/actions/downloadActions';
import { call } from '../../common/effects/call';
import { put } from '../../common/effects/put';
import { select } from '../../common/effects/select';
import {
  cancelDownload,
  copyDownloadLink,
  pauseDownload,
  resumeDownload,
  startDownload,
  showDownloadInFolder,
} from '../downloads';

export function* downloadsSaga(): Generator {
  yield takeLatest(downloadActions.shownInFolder.match, function* (action) {
    const { itemId } = action.payload;

    const download = yield* select((state) => state.downloads[itemId]);

    if (!download) {
      return;
    }

    yield* call(showDownloadInFolder, download);
  });

  yield takeLatest(downloadActions.shownInFolder.match, function* (action) {
    const { itemId } = action.payload;

    const download = yield* select((state) => state.downloads[itemId]);

    if (!download) {
      return;
    }

    yield* call(copyDownloadLink, download);
  });

  yield takeLatest(downloadActions.paused.match, function* (action) {
    const { itemId } = action.payload;

    const download = yield* select((state) => state.downloads[itemId]);

    if (!download) {
      return;
    }

    yield* call(pauseDownload, download);
  });

  yield takeLatest(downloadActions.resumed.match, function* (action) {
    const { itemId } = action.payload;

    const download = yield* select((state) => state.downloads[itemId]);

    if (!download) {
      return;
    }

    yield* call(resumeDownload, download);
  });

  yield takeLatest(downloadActions.cancelled.match, function* (action) {
    const { itemId } = action.payload;

    const download = yield* select((state) => state.downloads[itemId]);

    if (!download) {
      return;
    }

    yield* call(cancelDownload, download);
  });

  yield takeLatest(downloadActions.retried.match, function* (action) {
    const { itemId } = action.payload;

    const download = yield* select((state) => state.downloads[itemId]);

    if (!download) {
      return;
    }

    const server = yield* select((state) =>
      state.servers.find((server) => server.url === download.serverUrl)
    );

    if (!server?.webContentsId) {
      return;
    }

    yield* put(downloadActions.removed(itemId));
    yield* call(startDownload, download.url, server.webContentsId);
  });
}
