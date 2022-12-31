import { dispatch } from '../../store';
import { WEBVIEW_USER_LOGGED_IN } from '../../ui/actions';
import { Server } from '../common';
import { getServerUrl } from './urls';

export const setUserLoggedIn = (userLoggedIn: Server['userLoggedIn']): void => {
  dispatch({
    type: WEBVIEW_USER_LOGGED_IN,
    payload: {
      url: getServerUrl(),
      userLoggedIn,
    },
  });
};
