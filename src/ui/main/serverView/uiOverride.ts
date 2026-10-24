import type { Session } from 'electron';
import { session } from 'electron';

import { getWebContentsByServerUrl } from '.';
import { SERVER_UI_PREVIEW_CHANGED } from '../../../servers/actions';
import { dispatch, select } from '../../../store';

export type UiOverrideBundle = {
  url: string;
  // Shown once loaded; can name the exact build, which the label asked about up front cannot know yet.
  label: string;
  // Names the exact build when the source knows it, so a refresh can tell whether a newer one was published.
  version?: string;
};

export type UiOverrideSource = {
  // The Settings input that loads this source again.
  key: string;
  label: string;
  // An update calls it again, so a moving tag fetches its newest build.
  load: () => Promise<UiOverrideBundle>;
};

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
const overrides = new Map<
  string,
  {
    source: UiOverrideSource;
    bundleUrl: string;
    version?: string;
    loads: Set<AbortController>;
  }
>();

// Bumped by every apply and restore, so a load that finishes after a newer request is dropped.
const generations = new Map<string, number>();

const nextGeneration = (serverUrl: string) => {
  const generation = (generations.get(serverUrl) ?? 0) + 1;
  generations.set(serverUrl, generation);
  return generation;
};

const isKnownServer = (serverUrl: string) =>
  select(({ servers }) => servers.some((server) => server.url === serverUrl));

export const getUiOverride = (serverUrl: string) =>
  overrides.get(serverUrl)?.source;

export const getUiOverrideVersion = (serverUrl: string) =>
  overrides.get(serverUrl)?.version;

export const getUiOverrideBundleUrls = () =>
  [...overrides.values()].map(({ bundleUrl }) => bundleUrl);

export const getUiOverrideServerUrls = (key: string) =>
  [...overrides]
    .filter(([, { source }]) => source.key === key)
    .map(([serverUrl]) => serverUrl);

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

// protocol.handle gives the handler a Request without an abort signal, and a page that drops a response (a media element, an aborted fetch) does not cancel the load behind it.
// Its unread body then holds the connection's flow-control window, and once a few pile up every request to the server stalls.
// So each load gets its own controller, aborted when Electron cancels the body or the override goes away.
export const passthrough = async (
  ses: Session,
  request: Request,
  loads: Set<AbortController>
): Promise<Response> => {
  const controller = new AbortController();
  loads.add(controller);
  const release = () => loads.delete(controller);

  let response: Response;
  try {
    response = await ses.fetch(request, {
      bypassCustomProtocolHandlers: true,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (error) {
    release();
    throw error;
  }

  if (!response.body) {
    release();
    return response;
  }

  const reader = response.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(stream) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          release();
          stream.close();
          return;
        }
        stream.enqueue(value);
      } catch (error) {
        release();
        stream.error(error);
      }
    },
    cancel(reason) {
      release();
      controller.abort(reason);
    },
  });

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

const abortLoads = (loads: Set<AbortController> | undefined) => {
  loads?.forEach((controller) => controller.abort());
  loads?.clear();
};

// ponytail: every request of the server's scheme in this session goes through the main process while an override is active; fine for testing, not for daily use.
const createHandler =
  (
    ses: Session,
    serverUrl: string,
    bundleUrl: string,
    loads: Set<AbortController>
  ) =>
  async (request: Request): Promise<Response> => {
    const server = new URL(withTrailingSlash(serverUrl));
    const url = new URL(request.url);

    if (url.origin !== server.origin || request.method !== 'GET') {
      return passthrough(ses, request, loads);
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
      return passthrough(ses, request, loads);
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

// Resolves to the label shown, or null when a restore, a newer apply or the server's removal overtook this one while it loaded.
export const applyUiOverride = async (
  serverUrl: string,
  source: UiOverrideSource
): Promise<string | null> => {
  const generation = nextGeneration(serverUrl);
  const bundle = await source.load();
  if (generations.get(serverUrl) !== generation || !isKnownServer(serverUrl)) {
    return null;
  }
  const bundleUrl = withTrailingSlash(bundle.url);

  const ses = getServerSession(serverUrl);
  const scheme = getScheme(serverUrl);

  if (ses.protocol.isProtocolHandled(scheme)) {
    ses.protocol.unhandle(scheme);
  }
  abortLoads(overrides.get(serverUrl)?.loads);
  const loads = new Set<AbortController>();
  ses.protocol.handle(scheme, createHandler(ses, serverUrl, bundleUrl, loads));
  overrides.set(serverUrl, {
    source,
    bundleUrl,
    version: bundle.version,
    loads,
  });
  dispatch({
    type: SERVER_UI_PREVIEW_CHANGED,
    payload: {
      url: serverUrl,
      uiPreview: bundle.label,
      uiPreviewSource: source.key,
    },
  });

  await reloadServer(serverUrl, ses);
  return bundle.label;
};

export const clearUiOverride = async (serverUrl: string) => {
  nextGeneration(serverUrl);
  const override = overrides.get(serverUrl);
  if (!override) {
    return;
  }
  overrides.delete(serverUrl);

  const ses = getServerSession(serverUrl);
  ses.protocol.unhandle(getScheme(serverUrl));
  // Loads the preview started outlive the handler; the server's own UI would queue behind them.
  abortLoads(override.loads);
  dispatch({
    type: SERVER_UI_PREVIEW_CHANGED,
    payload: {
      url: serverUrl,
      uiPreview: undefined,
      uiPreviewSource: undefined,
    },
  });

  await reloadServer(serverUrl, ses);
};
