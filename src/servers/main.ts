import fs from 'fs';
import path from 'path';

import { app } from 'electron';
import { satisfies, coerce } from 'semver';

import { invoke } from '../ipc/main';
import { select, dispatch, listen } from '../store';
import { getRootWindow } from '../ui/main/rootWindow';
import {
  SERVER_URL_RESOLUTION_REQUESTED,
  SERVER_URL_RESOLVED,
  SERVERS_LOADED,
} from './actions';
import { ServerUrlResolutionStatus, Server, ServerUrlResolutionResult } from './common';


const REQUIRED_SERVER_VERSION_RANGE = '>=2.0.0';

export const convertToURL = (input: string): URL => {
  let url: URL;

  if (/^https?:\/\//.test(input)) {
    url = new URL(input);
  } else {
    url = new URL(`https://${ input }`);
  }

  const { protocol, username, password, hostname, port, pathname } = url;
  return Object.assign(new URL('https://0.0.0.0'), {
    protocol,
    username,
    password,
    hostname,
    port: (protocol === 'http' && port === '80' && undefined)
      || (protocol === 'https' && port === '443' && undefined)
      || port,
    pathname: /\/$/.test(pathname) ? pathname : `${ pathname }/`,
  });
};

const fetchServerInformation = async (url: URL): Promise<[finalURL: URL, version: string]> => {
  const { webContents } = await getRootWindow();
  const [urlHref, version] = await invoke(webContents, 'servers/fetch-info', url.href);
  return [convertToURL(urlHref), version];
};

export const resolveServerUrl = async (input: string): Promise<ServerUrlResolutionResult> => {
  let url: URL;

  try {
    url = convertToURL(input);
  } catch (error) {
    return [input, ServerUrlResolutionStatus.INVALID_URL, error];
  }

  let version: string;

  try {
    [url, version] = await fetchServerInformation(url);
  } catch (error) {
    if (!/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(input)) {
      return resolveServerUrl(`https://${ input }.rocket.chat`);
    }

    if (error?.name === 'AbortError') {
      return [url.href, ServerUrlResolutionStatus.TIMEOUT, error];
    }

    return [url.href, ServerUrlResolutionStatus.INVALID, error];
  }

  if (!satisfies(coerce(version), REQUIRED_SERVER_VERSION_RANGE)) {
    return [
      url.href,
      ServerUrlResolutionStatus.INVALID,
      new Error(`incompatible server version (${ version }, expected ${ REQUIRED_SERVER_VERSION_RANGE })`),
    ];
  }

  return [url.href, ServerUrlResolutionStatus.OK];
};

const loadAppServers = async (): Promise<Record<string, string>> => {
  try {
    const filePath = path.join(
      app.getAppPath(),
      app.getAppPath().endsWith('app.asar') ? '..' : '.',
      'servers.json',
    );
    const content = await fs.promises.readFile(filePath, 'utf8');
    const json = JSON.parse(content);

    return json && typeof json === 'object' ? json : {};
  } catch (error) {
    return {};
  }
};

const loadUserServers = async (): Promise<Record<string, string>> => {
  try {
    const filePath = path.join(app.getPath('userData'), 'servers.json');
    const content = await fs.promises.readFile(filePath, 'utf8');
    const json = JSON.parse(content);
    await fs.promises.unlink(filePath);

    return json && typeof json === 'object' ? json : {};
  } catch (error) {
    return {};
  }
};

export const setupServers = async (localStorage: Record<string, string>): Promise<void> => {
  listen(SERVER_URL_RESOLUTION_REQUESTED, async (action) => {
    try {
      dispatch({
        type: SERVER_URL_RESOLVED,
        payload: await resolveServerUrl(action.payload),
        meta: {
          response: true,
          id: action.meta?.id,
        },
      });
    } catch (error) {
      dispatch({
        type: SERVER_URL_RESOLVED,
        payload: error,
        error: true,
        meta: {
          response: true,
          id: action.meta?.id,
        },
      });
    }
  });

  let servers = select(({ servers }) => servers);
  let currentServerUrl = select(({ currentView }) => (typeof currentView === 'object' ? currentView.url : null));

  const serversMap = new Map<Server['url'], Server>(
    servers
      .filter(Boolean)
      .filter(({ url, title }) => typeof url === 'string' && typeof title === 'string')
      .map((server) => [server.url, server]),
  );

  if (localStorage['rocket.chat.hosts']) {
    try {
      const storedString = JSON.parse(localStorage['rocket.chat.hosts']);

      if (/^https?:\/\//.test(storedString)) {
        serversMap.set(storedString, { url: storedString, title: storedString });
      } else {
        const storedValue = JSON.parse(storedString);

        if (Array.isArray(storedValue)) {
          storedValue.map((url) => url.replace(/\/$/, '')).forEach((url) => {
            serversMap.set(url, { url, title: url });
          });
        }
      }
    } catch (error) {
      console.warn(error);
    }
  }

  if (serversMap.size === 0) {
    const appConfiguration = await loadAppServers();

    for (const [title, url] of Object.entries(appConfiguration)) {
      serversMap.set(url, { url, title });
    }

    const userConfiguration = await loadUserServers();

    for (const [title, url] of Object.entries(userConfiguration)) {
      serversMap.set(url, { url, title });
    }
  }

  if (localStorage['rocket.chat.currentHost'] && localStorage['rocket.chat.currentHost'] !== 'null') {
    currentServerUrl = localStorage['rocket.chat.currentHost'];
  }

  servers = Array.from(serversMap.values());
  currentServerUrl = serversMap.get(currentServerUrl)?.url ?? servers[0]?.url ?? null;

  if (localStorage['rocket.chat.sortOrder']) {
    try {
      const sorting = JSON.parse(localStorage['rocket.chat.sortOrder']);
      if (Array.isArray(sorting)) {
        servers = [...serversMap.values()]
          .sort((a, b) => sorting.indexOf(a.url) - sorting.indexOf(b.url));
      }
    } catch (error) {
      console.warn(error);
    }
  }

  dispatch({
    type: SERVERS_LOADED,
    payload: {
      servers,
      selected: currentServerUrl,
    },
  });
};
