import { call, Effect } from 'redux-saga/effects';

import { WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED } from '../../actions';
import { request } from '../../channels';

const handleGetSourceIdEvent = async (): Promise<void> => {
	try {
		const sourceId: string = await request(WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED, undefined);
		window.top.postMessage({ sourceId }, '*');
	} catch (error) {
		window.top.postMessage({ sourceId: 'PermissionDeniedError' }, '*');
	}
};

export const attachGetSourceIdEventListener = (): void => {
	window.addEventListener('get-sourceId', handleGetSourceIdEvent);
};

export function *listenToScreenSharingRequests(): Generator<Effect, void> {
	yield call(attachGetSourceIdEventListener);
}
