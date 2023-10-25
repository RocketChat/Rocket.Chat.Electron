import { dispatch } from '../../store';
import { WEBVIEW_SERVER_UNIQUE_ID_UPDATED } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';

export const setWorkspaceUID = (uniqueID: Server['uniqueID']): void => {
  dispatch({
    type: WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
    payload: {
      url: getServerUrl(),
      uniqueID,
    },
  });
};
