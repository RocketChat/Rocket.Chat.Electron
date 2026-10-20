import { dispatch } from '../../store';
import { WEBVIEW_USER_LOGGED_IN } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';
import { clearUserRoles, updateUserRoles } from './userRoles';

let lastUserLoggedIn: Server['userLoggedIn'] | undefined;

// More than one source reports the login (the web client's login events and
// its presence snapshot). A repeat would refetch the user roles.
export const setUserLoggedIn = (userLoggedIn: Server['userLoggedIn']): void => {
  if (userLoggedIn === lastUserLoggedIn) {
    return;
  }
  lastUserLoggedIn = userLoggedIn;

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
