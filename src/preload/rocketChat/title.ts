import { eventChannel, EventChannel } from 'redux-saga';
import { call, CallEffect, takeEvery, put, Effect } from 'redux-saga/effects';

import { WEBVIEW_TITLE_CHANGED } from '../../actions';
import { getServerUrl } from './getServerUrl';

const createTitleUpdatesChannel = (): CallEffect<EventChannel<string>> =>
	call(() => eventChannel<string>((emit) => {
		const { Tracker } = window.require('meteor/tracker');
		const { settings } = window.require('/app/settings');

		const computation = Tracker.autorun(() => {
			const siteName = settings.get('Site_Name');
			if (typeof siteName !== 'string') {
				return;
			}

			emit(siteName);
		});

		return () => {
			computation.stop();
		};
	}));

export function *listenToTitleChanges(): Generator<Effect, void> {
	const titleUpdates = (yield createTitleUpdatesChannel()) as EventChannel<string>;

	yield takeEvery(titleUpdates, function *(title) {
		yield put({
			type: WEBVIEW_TITLE_CHANGED,
			payload: {
				url: yield call(getServerUrl),
				title,
			},
		});
	});
}
