import { WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED } from '../actions';
import { request } from '../channels';

const handleGetSourceIdEvent = async () => {
	try {
		const sourceId = await request(WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED);
		window.top.postMessage({ sourceId }, '*');
	} catch (error) {
		window.top.postMessage({ sourceId: 'PermissionDeniedError' }, '*');
	}
};

export const setupScreenSharing = async () => {
	window.addEventListener('get-sourceId', handleGetSourceIdEvent);
};
