import { dispatch } from '../../store';
import { WEBVIEW_USER_LOGGED_IN } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';
import { clearUserRoles, updateUserRoles } from './userRoles';

export const setUserLoggedIn = (userLoggedIn: Server['userLoggedIn']): void => {
  dispatch({
    type: WEBVIEW_USER_LOGGED_IN,
    payload: {
      url: getServerUrl(),
      userLoggedIn,
    },
  });

  if (userLoggedIn) {
    void updateUserRoles();
  } else {
    clearUserRoles();
  }
};
