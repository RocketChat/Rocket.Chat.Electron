import { dispatch } from '../../store';
import { WEBVIEW_SERVER_VERSION_UPDATED } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';

export const setVersion = (version: Server['version']): void => {
  dispatch({
    type: WEBVIEW_SERVER_VERSION_UPDATED,
    payload: {
      url: getServerUrl(),
      version,
    },
  });
};
