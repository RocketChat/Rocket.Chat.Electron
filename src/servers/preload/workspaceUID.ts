import { dispatch } from '../../store';
import { WEBVIEW_SERVER_WORKSPACE_UID_UPDATED } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';

export const setWorkspaceUID = (workspaceUID: Server['workspaceUID']): void => {
  dispatch({
    type: WEBVIEW_SERVER_WORKSPACE_UID_UPDATED,
    payload: {
      url: getServerUrl(),
      workspaceUID,
    },
  });
};
