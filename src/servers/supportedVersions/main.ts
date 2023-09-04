import { ltr } from 'semver';

import { dispatch, listen, select } from '../../store';
import {
  WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
  WEBVIEW_SERVER_VERSION_UPDATED,
} from '../../ui/actions';
import type { LTSServerInfo } from './types';
import { getLTSServerInfo, isServerVersionSupported } from './types';

export function checkSupportedVersionServers(): void {
  listen(WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED, async (action) => {
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

  listen(WEBVIEW_SERVER_VERSION_UPDATED, async (action) => {
    const server = select(({ servers }) => servers).find(
      (server) => server.url === action.payload.url
    );
    if (!server || !server.version) return;
    if (ltr(server.version, '1.4.0')) return; // FALLBACK EXCEPTIONS
    const serverInfo = (await getLTSServerInfo(server.url)) as LTSServerInfo;

    if (!serverInfo.supportedVersions) return;
    dispatch({
      type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
      payload: {
        url: server.url,
        supportedVersions: serverInfo.supportedVersions,
      },
    });
  });
}
