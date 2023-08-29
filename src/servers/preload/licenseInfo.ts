import { dispatch } from '../../store';
import { WEBVIEW_SERVER_INFO_UPDATED } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';

export const setSupportedVersions = (
  supportedVersions: Server['supportedVersions']
): void => {
  dispatch({
    type: WEBVIEW_SERVER_INFO_UPDATED,
    payload: {
      url: getServerUrl(),
      supportedVersions,
    },
  });
};
