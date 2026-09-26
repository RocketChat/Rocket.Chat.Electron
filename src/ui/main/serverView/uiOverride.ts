import type { Session } from 'electron';
import { session } from 'electron';

import { getWebContentsByServerUrl } from '.';
import { SERVER_UI_PREVIEW_CHANGED } from '../../../servers/actions';
import { dispatch } from '../../../store';

// Paths the Rocket.Chat server answers itself; mirrors `serverRoutes` in apps/meteor/vite/vite.config.mts.
const serverRoutes = [
  '/api',
  '/_oauth',
  '/_saml',
  '/_cas',
  '/_accounts',
  '/_timesync',
  '/i18n',
  '/avatar',
  '/emoji-custom',
  '/custom-sounds',
  '/file-upload',
  '/file-decrypt',
  '/ufs',
  '/data-export',
  '/assets',
  '/livechat',
  '/theme.css',
  '/robots.txt',
  '/css-theme',
  '/scripts_',
  '/websocket',
  '/sockjs',
];

// Vite `build.assetsDir` of the standalone client.
const bundleAssetsPath = '/bundle/';

// ponytail: in-memory only, so a restart always returns every server to its own UI.
const overrides = new Set<string>();

const withTrailingSlash = (url: string) =>
  url.endsWith('/') ? url : `${url}/`;

const getServerSession = (serverUrl: string) =>
  session.fromPartition(`persist:${serverUrl}`);

const getScheme = (serverUrl: string) =>
  new URL(serverUrl).protocol.replace(':', '');

export const isUiServedFromServer = (
  pathname: string,
  serverPathPrefix: string
) => {
  const path = pathname.startsWith(serverPathPrefix)
    ? pathname.slice(serverPathPrefix.length) || '/'
    : pathname;
  return serverRoutes.some((route) => path.startsWith(route));
};

// The Meteor server injects the runtime config and base path into its HTML; the static bundle's index.html has neither.
export const prepareIndexHtml = (html: string, serverUrl: string) => {
  const { origin, pathname } = new URL(withTrailingSlash(serverUrl));
  const runtimeConfig = JSON.stringify({
    ROOT_URL: origin + pathname,
    ROOT_URL_PATH_PREFIX: pathname.replace(/\/$/, ''),
  });
  return html
    .replace(/<base href="[^"]*"\s*\/?>/, `<base href="${pathname}" />`)
    .replace(
      '<head>',
      `<head><script>window.__meteor_runtime_config__ = ${runtimeConfig};</script>`
    );
};

const passthrough = (ses: Session, request: Request) =>
  ses.fetch(request, {
    bypassCustomProtocolHandlers: true,
    credentials: 'include',
  });

// ponytail: every request of the server's scheme in this session goes through the main process while an override is active; fine for testing, not for daily use.
const createHandler =
  (ses: Session, serverUrl: string, bundleUrl: string) =>
  async (request: Request): Promise<Response> => {
    const server = new URL(withTrailingSlash(serverUrl));
    const url = new URL(request.url);

    if (url.origin !== server.origin || request.method !== 'GET') {
      return passthrough(ses, request);
    }

    if (url.pathname.startsWith(bundleAssetsPath)) {
      return ses.fetch(new URL(url.pathname.slice(1), bundleUrl).href, {
        bypassCustomProtocolHandlers: true,
      });
    }

    const isDocument = request.headers.get('accept')?.includes('text/html');
    if (
      !isDocument ||
      isUiServedFromServer(url.pathname, server.pathname.replace(/\/$/, ''))
    ) {
      return passthrough(ses, request);
    }

    const index = await ses.fetch(new URL('index.html', bundleUrl).href, {
      bypassCustomProtocolHandlers: true,
      cache: 'no-store',
    });
    if (!index.ok) {
      return index;
    }

    return new Response(prepareIndexHtml(await index.text(), serverUrl), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  };

const reloadServer = async (serverUrl: string, ses: Session) => {
  // A cached Meteor service worker would otherwise keep serving the previous UI.
  await ses.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
  await ses.clearCache();
  getWebContentsByServerUrl(serverUrl)?.reloadIgnoringCache();
};

export const applyUiOverride = async (
  serverUrl: string,
  bundleUrl: string,
  label = bundleUrl
) => {
  const ses = getServerSession(serverUrl);
  const scheme = getScheme(serverUrl);
  const normalizedBundleUrl = withTrailingSlash(bundleUrl);

  if (ses.protocol.isProtocolHandled(scheme)) {
    ses.protocol.unhandle(scheme);
  }
  ses.protocol.handle(
    scheme,
    createHandler(ses, serverUrl, normalizedBundleUrl)
  );
  overrides.add(serverUrl);
  dispatch({
    type: SERVER_UI_PREVIEW_CHANGED,
    payload: { url: serverUrl, uiPreview: label },
  });

  await reloadServer(serverUrl, ses);
};

export const clearUiOverride = async (serverUrl: string) => {
  if (!overrides.delete(serverUrl)) {
    return;
  }

  const ses = getServerSession(serverUrl);
  ses.protocol.unhandle(getScheme(serverUrl));
  dispatch({
    type: SERVER_UI_PREVIEW_CHANGED,
    payload: { url: serverUrl, uiPreview: undefined },
  });

  await reloadServer(serverUrl, ses);
};
