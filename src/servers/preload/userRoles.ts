import { dispatch } from '../../store';
import { WEBVIEW_USER_ROLES_CHANGED } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';

// When the web client pushes roles through the RocketChatDesktop.setUserRoles
// bridge, that source is authoritative and reactive, so the REST fallback must
// not override it. Older web clients never call the bridge, leaving this false
// and letting the fetch fallback run.
let rolesProvidedByBridge = false;

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
 * Authoritative path: the web client observes its own reactive user and pushes
 * roles. Reactive and free of token handling/REST. Takes precedence over the
 * fetch fallback.
 */
export const setUserRoles = (roles: unknown): void => {
  if (!Array.isArray(roles)) return;
  const userRoles = roles.filter(
    (role): role is string => typeof role === 'string'
  );
  rolesProvidedByBridge = true;
  dispatchUserRoles(userRoles);
};

/**
 * Fallback path for web clients that don't push roles through the bridge.
 * Reads the logged-in user's roles from the workspace REST API. Skipped once
 * the bridge has provided roles. Any failure leaves roles unset, which makes
 * role-targeted messages fall back to being shown to everyone — the
 * pre-existing behavior.
 */
export const updateUserRoles = async (): Promise<void> => {
  if (rolesProvidedByBridge) return;

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

    // The bridge may have resolved while the request was in flight; if so, keep
    // the authoritative value.
    if (rolesProvidedByBridge) return;

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
  rolesProvidedByBridge = false;
  dispatchUserRoles(undefined);
};
