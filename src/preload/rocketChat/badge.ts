import { getServerUrl } from '.';
import { WEBVIEW_UNREAD_CHANGED } from '../../actions';
import { dispatch } from '../../channels';

const handleUnreadChangedEvent = (event: CustomEvent<'*' | number>): void => {
	dispatch({
		type: WEBVIEW_UNREAD_CHANGED,
		payload: {
			url: getServerUrl(),
			badge: event.detail,
		},
	});
};

export const setupBadgeChanges = (): void => {
	window.addEventListener('unread-changed', handleUnreadChangedEvent);
};
