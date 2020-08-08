import { takeEvery, take, put, Effect } from 'redux-saga/effects';

import { WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED, WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED, SCREEN_SHARING_DIALOG_DISMISSED } from '../actions';
import { RequestAction } from '../channels';

export function *takeScreenSharingActions(): Generator<Effect> {
	yield takeEvery(WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED, function *(action: RequestAction<void>) {
		const { meta: { id } } = action;
		const responseAction = yield take([
			WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
			SCREEN_SHARING_DIALOG_DISMISSED,
		]);

		const sourceId = responseAction.type === WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED
			? responseAction.payload
			: null;

		yield put({
			type: WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
			payload: sourceId,
			meta: {
				id,
				response: true,
			},
		});
	});
}
