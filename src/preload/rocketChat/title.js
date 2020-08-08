import { getServerUrl } from '.';
import { WEBVIEW_TITLE_CHANGED } from '../../actions';
import { dispatch } from '../../channels';

export const setupTitleChanges = () => {
	const { Tracker } = window.require('meteor/tracker');
	const { settings } = window.require('/app/settings');

	Tracker.autorun(() => {
		const siteName = settings.get('Site_Name');
		if (typeof siteName !== 'string') {
			return;
		}

		dispatch({
			type: WEBVIEW_TITLE_CHANGED,
			payload: {
				url: getServerUrl(),
				title: siteName,
			},
		});
	});
};
