import { dispatch, listen, select } from '../../store';
import {
  WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
  WEBVIEW_SERVER_WORKSPACE_UID_UPDATED,
} from '../../ui/actions';
import { isServerVersionSupported } from './types';

export function checkSupportedVersionServers(): void {
  listen(WEBVIEW_SERVER_WORKSPACE_UID_UPDATED, async (action) => {
    const server = select(({ servers }) => servers).find(
      (server) => server.url === action.payload.url
    );
    if (!server) return;
    const isSupportedVersion = await isServerVersionSupported(server);
    dispatch({
      type: WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
      payload: {
        url: server.url,
        isSupportedVersion,
      },
    });
  });
}
