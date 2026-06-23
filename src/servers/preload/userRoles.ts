import { dispatch } from '../../store';
import { WEBVIEW_USER_ROLES_CHANGED } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';

const dispatchUserRoles = (userRoles: Server['userRoles']): void => {
  dispatch({
    type: WEBVIEW_USER_ROLES_CHANGED,
    payload: {
      url: getServerUrl(),
      userRoles,
    },
  });
};

const buildMeEndpoint = (serverUrl: string): string =>
  `${serverUrl.replace(/\/$/, '')}/api/v1/me`;

/**
 * Reads the logged-in user's roles from the workspace REST API and stores them
 * on the server state. Roles are used to decide which supportedVersions
 * messages a user is allowed to see (see Message.roles). Any failure leaves
 * roles unset, which makes role-targeted messages fall back to being shown to
 * everyone — the pre-existing behavior.
 */
export const updateUserRoles = async (): Promise<void> => {
  try {
    const serverUrl = getServerUrl();
    if (!serverUrl) return;

    const authToken = localStorage.getItem('Meteor.loginToken');
    const userId = localStorage.getItem('Meteor.userId');
    if (!authToken || !userId) return;

    const response = await fetch(buildMeEndpoint(serverUrl), {
      headers: {
        'X-Auth-Token': authToken,
        'X-User-Id': userId,
      },
    });
    if (!response.ok) return;

    const data = await response.json();
    const roles: unknown = data?.roles;
    if (!Array.isArray(roles)) return;

    const userRoles = roles.filter(
      (role): role is string => typeof role === 'string'
    );
    dispatchUserRoles(userRoles);
  } catch {
    // Network/parse errors are non-fatal: leave roles unset so role-targeted
    // messages default to visible.
  }
};

export const clearUserRoles = (): void => {
  dispatchUserRoles(undefined);
};
