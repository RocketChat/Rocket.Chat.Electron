import { dispatch } from '../../store';
import { WEBVIEW_TITLE_CHANGED } from '../../ui/actions';
import { getServerUrl } from './urls';

export const setTitle = (title: string): void => {
  if (typeof title !== 'string') {
    return;
  }

  const url = getServerUrl();

  if (title === 'Rocket.Chat' && new URL(url).host !== 'open.rocket.chat') {
    dispatch({
      type: WEBVIEW_TITLE_CHANGED,
      payload: {
        url,
        title: `${title} - ${url}`,
      },
    });
    return;
  }

  dispatch({
    type: WEBVIEW_TITLE_CHANGED,
    payload: {
      url,
      title,
    },
  });
};
