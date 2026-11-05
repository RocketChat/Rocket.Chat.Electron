import { dispatch } from '../../store';
import { WEBVIEW_TITLE_CHANGED } from '../../ui/actions';
import { redactServerUrl } from '../common';
import { getServerUrl } from './urls';
import { runWhenPreloadReady } from './whenPreloadReady';

const applyTitle = (title: string): void => {
  const url = getServerUrl();

  if (title === 'Rocket.Chat' && new URL(url).host !== 'open.rocket.chat') {
    dispatch({
      type: WEBVIEW_TITLE_CHANGED,
      payload: {
        url,
        title: `${title} - ${redactServerUrl(url)}`,
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

export const setTitle = (title: string): void => {
  if (typeof title !== 'string') {
    return;
  }

  runWhenPreloadReady('title', () => applyTitle(title));
};
