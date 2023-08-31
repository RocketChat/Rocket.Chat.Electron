import { dispatch } from '../../store';
import { WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';

export const setSupportedVersions = (
  supportedVersions: Server['supportedVersions']
): void => {
  dispatch({
    type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
    payload: {
      url: getServerUrl(),
      supportedVersions,
    },
  });
};
