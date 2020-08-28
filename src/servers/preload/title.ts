import { dispatch } from '../../store';
import { WEBVIEW_TITLE_CHANGED } from '../../ui/actions';
import { getServerUrl } from './getServerUrl';

export const listenToTitleChanges = (): void => {
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
