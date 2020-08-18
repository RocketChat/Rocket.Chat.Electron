import { Effect, takeEvery, put, call } from 'redux-saga/effects';

import { WEBVIEW_UNREAD_CHANGED } from '../../actions';
import { eventTargetEvent } from '../../channels';
import { getServerUrl } from './getServerUrl';

export function *listenToBadgeChanges(): Generator<Effect, void> {
	const windowUnreadChangedEvent = eventTargetEvent<CustomEvent<'•' | number>>(window, 'unload', {
		passive: false,
	});

	yield takeEvery(windowUnreadChangedEvent, function *(event): Generator<Effect, void> {
		yield put({
			type: WEBVIEW_UNREAD_CHANGED,
			payload: {
				url: yield call(getServerUrl),
				badge: event.detail,
			},
		});
	});
}
