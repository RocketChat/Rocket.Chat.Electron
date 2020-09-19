import fs from 'fs';
import path from 'path';

import { app } from 'electron';
import fetch from 'node-fetch';
import { satisfies, coerce } from 'semver';

import {
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
} from '../navigation/actions';
import { select, dispatch, listen } from '../store';
import { ActionOf } from '../store/actions';
import { SERVER_VALIDATION_REQUESTED, SERVER_VALIDATION_RESPONDED, SERVERS_LOADED } from './actions';
import { ValidationResult, Server } from './common';

export const normalizeServerUrl = (input: string): string => {
  try {
    if (typeof input !== 'string') {
      throw new TypeError('server URL is not a string');
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(input);
    } catch (error) {
      parsedUrl = new URL(`https://${ input }`);
    }

    const { protocol, username, password, hostname, port, pathname } = parsedUrl;
    return Object.assign(new URL('https://0.0.0.0'), {
      protocol,
      username,
      password,
      hostname,
      port,
      pathname,
    }).href;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getServerVersion = async (serverUrl: string): Promise<string> => {
  const { username, password, href } = new URL(serverUrl);
  const headers: HeadersInit = [];

  if (username && password) {
    headers.push(['Authorization', `Basic ${ btoa(`${ username }:${ password }`) }`]);
  }

  const endpoint = new URL('api/info', href);

  const response = await fetch(endpoint, {
    headers,
    timeout: 5000,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const responseBody: {
    success: boolean;
    version: string;
  } = await response.json();

  if (!responseBody.success) {
    throw new Error();
  }

  return responseBody.version;
};

export const validateServer = async (serverUrl: string): Promise<void> => {
  const version = await getServerVersion(serverUrl);

  if (!satisfies(coerce(version), '>=3.0.x')) {
    throw new Error(`incompatible server version (${ version }, expected >=3.0.x)`);
  }
};

export const validateServerUrl = async (serverUrl: string, timeout = 5000): Promise<ValidationResult> => {
  try {
    const { username, password, href } = new URL(serverUrl);
    const headers: HeadersInit = [];

    if (username && password) {
      headers.push(['Authorization', `Basic ${ btoa(`${ username }:${ password }`) }`]);
    }

    const response = await Promise.race([
      fetch(`${ href.replace(/\/$/, '') }/api/info`, { headers }),
      new Promise<void>((resolve) => {
        setTimeout(resolve, timeout);
      }),
    ]);

    if (!response) {
      return ValidationResult.TIMEOUT;
    }

    if (!response.ok) {
      return ValidationResult.INVALID;
    }

    const responseBody = await response.json();

    if (!responseBody.success) {
      return ValidationResult.INVALID;
    }

    return ValidationResult.OK;
  } catch (error) {
    console.error(error);
    return ValidationResult.INVALID;
  }
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
  listen(SERVER_VALIDATION_REQUESTED, async (action) => {
    try {
      dispatch({
        type: SERVER_VALIDATION_RESPONDED,
        payload: await validateServerUrl(action.payload.serverUrl, action.payload.timeout),
        meta: {
          response: true,
          id: action.meta?.id,
        },
      });
    } catch (error) {
      dispatch({
        type: SERVER_VALIDATION_RESPONDED,
        payload: error,
        error: true,
        meta: {
          response: true,
          id: action.meta?.id,
        },
      });
    }
  });

  listen(CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED, (action) => {
    const isResponse: Parameters<typeof listen>[0] = (responseAction) =>
      [
        SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
        SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
      ].includes(responseAction.type)
      && responseAction.meta?.id === action.meta.id;

    const unsubscribe = listen(isResponse, (responseAction: ActionOf<
      typeof SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED
    | typeof SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED
    >) => {
      unsubscribe();

      const fingerprint = responseAction.type === SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED
        ? responseAction.payload
        : null;

      dispatch({
        type: SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
        payload: fingerprint,
        meta: {
          response: true,
          id: action.meta?.id,
        },
      });
    });
  });

  let servers = select(({ servers }) => servers);
  let currentServerUrl = select(({ currentServerUrl }) => currentServerUrl);

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
  currentServerUrl = serversMap.get(currentServerUrl)?.url ?? null;

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
      currentServerUrl,
    },
  });
};
