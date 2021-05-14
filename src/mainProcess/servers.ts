import { satisfies, coerce } from 'semver';

import {
  SERVER_URL_RESOLUTION_REQUESTED,
  SERVER_URL_RESOLVED,
} from '../common/actions/serversActions';
import { hasMeta } from '../common/fsa';
import { dispatch, listen } from '../common/store';
import type { ServerUrlResolutionResult } from '../common/types/ServerUrlResolutionResult';
import { ServerUrlResolutionStatus } from '../common/types/ServerUrlResolutionStatus';
import { invoke } from '../ipc/main';
import { getRootWindow } from './rootWindow';

const REQUIRED_SERVER_VERSION_RANGE = '>=2.0.0';

export const convertToURL = (input: string): URL => {
  let url: URL;

  if (/^https?:\/\//.test(input)) {
    url = new URL(input);
  } else {
    url = new URL(`https://${input}`);
  }

  const { protocol, username, password, hostname, port, pathname } = url;
  return Object.assign(new URL('https://0.0.0.0'), {
    protocol,
    username,
    password,
    hostname,
    port:
      (protocol === 'http' && port === '80' && undefined) ||
      (protocol === 'https' && port === '443' && undefined) ||
      port,
    pathname: /\/$/.test(pathname) ? pathname : `${pathname}/`,
  });
};

const fetchServerInformation = async (
  url: URL
): Promise<[finalURL: URL, version: string]> => {
  const { webContents } = await getRootWindow();
  const [urlHref, version] = await invoke(
    webContents,
    'servers/fetch-info',
    url.href
  );
  return [convertToURL(urlHref), version];
};

export const resolveServerUrl = async (
  input: string
): Promise<ServerUrlResolutionResult> => {
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
    if (
      !/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(input)
    ) {
      return resolveServerUrl(`https://${input}.rocket.chat`);
    }

    if (error?.name === 'AbortError') {
      return [url.href, ServerUrlResolutionStatus.TIMEOUT, error];
    }

    return [url.href, ServerUrlResolutionStatus.INVALID, error];
  }

  const semver = coerce(version);

  if (!semver || !satisfies(semver, REQUIRED_SERVER_VERSION_RANGE)) {
    return [
      url.href,
      ServerUrlResolutionStatus.INVALID,
      new Error(
        `incompatible server version (${version}, expected ${REQUIRED_SERVER_VERSION_RANGE})`
      ),
    ];
  }

  return [url.href, ServerUrlResolutionStatus.OK];
};

export const setupServers = (): void => {
  listen(SERVER_URL_RESOLUTION_REQUESTED, async (action) => {
    if (!hasMeta(action)) {
      return;
    }

    try {
      dispatch({
        type: SERVER_URL_RESOLVED,
        payload: await resolveServerUrl(action.payload),
        meta: {
          response: true,
          id: action.meta.id,
        },
      });
    } catch (error) {
      dispatch({
        type: SERVER_URL_RESOLVED,
        payload: error,
        error: true,
        meta: {
          response: true,
          id: action.meta.id,
        },
      });
    }
  });
};
