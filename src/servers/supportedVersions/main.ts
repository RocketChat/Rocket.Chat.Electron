import moment from 'moment';

import { dispatch, listen, select } from '../../store';
import {
  SUPPORTED_VERSION_DIALOG_OPEN,
  WEBVIEW_DID_NAVIGATE,
  WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
  WEBVIEW_SERVER_VERSION_UPDATED,
} from '../../ui/actions';
import { getSupportedVersionsData, isServerVersionSupported } from './types';

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
    // if (ltr(server.version, '1.4.0')) return; // FALLBACK EXCEPTIONS
    const supportedVersions = await getSupportedVersionsData(server);
    dispatch({
      type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
      payload: {
        url: server.url,
        supportedVersions,
      },
    });
  });

  listen(WEBVIEW_DID_NAVIGATE, async (action) => {
    const currentServerUrl = select(({ currentView }) =>
      typeof currentView === 'object' ? currentView.url : null
    );
    const server = select(({ servers }) => servers).find(
      (server) =>
        server.url === action.payload.url && server.url === currentServerUrl
    );
    if (!server || server.expirationMessage === null) return;
    const { expirationMessage, expirationMessageLastTimeShown } = server;
    if (!expirationMessage) return;
    if (
      expirationMessageLastTimeShown &&
      moment().diff(expirationMessageLastTimeShown, 'seconds') < 12
    )
      return;

    dispatch({ type: SUPPORTED_VERSION_DIALOG_OPEN });
  });
}
