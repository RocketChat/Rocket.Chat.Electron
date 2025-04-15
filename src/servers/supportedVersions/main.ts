import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import axios from 'axios';
import { ipcMain } from 'electron';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import { coerce, satisfies } from 'semver';
import semverGte from 'semver/functions/gte';

import { dispatch, listen, select } from '../../store';
import {
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
  WEBVIEW_SERVER_VERSION_UPDATED,
  WEBVIEW_READY,
  WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
  WEBVIEW_SERVER_RELOADED,
  SUPPORTED_VERSION_DIALOG_DISMISS,
} from '../../ui/actions';
import * as urls from '../../urls';
import type { Server } from '../common';
import type {
  CloudInfo,
  Dictionary,
  Message,
  ServerInfo,
  SupportedVersions,
} from './types';

const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvZ/T/RHOr6+yo/iMLUlf
agMiMLFxQR/5Qtc85ykMBvKZqbBGb9zU68VB9n54alrbZG5FdcHkSJXgJIBXF2bk
TGTfBi58JmltZirSWzvXoXnT4ieGNZv+BqnP9zzj9HXOVhVncbRmJPEIJOZfL9AQ
beix3rPgZx3ZepAaoMQnz11dZKDGzkMN75WkTdf324X3DeFgLVmjsYuAcLl/AJMA
uPKSSt0XOQUsfrT7rEqXIrj8rIJcWxIHICMRrwfjw2Qh+3pfIrh7XSzxlW4zCKBN
RpavrrCnpOFRfkC5T9eMKLgyapjufOtbjuzu25N3urBsg6oRFNzsGXWp1C7DwUO2
kwIDAQAB
-----END PUBLIC KEY-----`;

const decodeSupportedVersions = (token: string) =>
  jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as SupportedVersions;

let builtinSupportedVersions: SupportedVersions | undefined;

const getBuiltinSupportedVersions = async (): Promise<
  SupportedVersions | undefined
> => {
  if (builtinSupportedVersions) return builtinSupportedVersions;

  try {
    const filePath = fileURLToPath(
      new URL('./supportedVersions.jwt', import.meta.url)
    );
    const encodedToken = await readFile(filePath, 'utf8');
    builtinSupportedVersions = decodeSupportedVersions(encodedToken);
    return builtinSupportedVersions;
  } catch (e) {
    console.error('Error loading supportedVersions.jwt', e);
    return undefined;
  }
};

const logRequestError =
  (description: string) =>
  (error: unknown): undefined => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(
          `Couldn't load ${description}: ${error.response.status} ${error.response.data}`
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error(`Couldn't load ${description}: ${error.message}`);
      }
    } else {
      console.error('Fetching ${description} error:', error);
    }
    return undefined;
  };

const getCloudInfo = async (
  url: string,
  uniqueId: string
): Promise<CloudInfo | undefined> => {
  const domain = new URL(url).hostname;
  const response = await axios.get<CloudInfo>(
    urls.supportedVersions({ domain, uniqueId })
  );
  return response.data;
};

const getServerInfo = async (url: string): Promise<ServerInfo> => {
  const response = await axios.get<ServerInfo>(urls.server(url).info);
  return response.data;
};

const getUniqueId = async (
  url: string,
  version: string
): Promise<string | null> => {
  const validVersion = coerce(version?.trim() || '0.0.0')?.version || '0.0.0';

  const serverUrl = semverGte(validVersion, '7.0.0')
    ? urls.server(url).uniqueId
    : urls.server(url).setting('uniqueID');

  try {
    const response = await axios.get<{ settings: { value: string }[] }>(
      serverUrl
    );
    const value = response.data?.settings?.[0]?.value;

    if (!value) {
      console.warn(`No unique ID found for server ${url}`);
      return null;
    }

    return value;
  } catch (error) {
    console.warn(`Error fetching unique ID for server ${url}:`, error);
    return null;
  }
};

const getExpirationMessage = ({
  messages,
  expiration,
}: {
  messages?: Message[];
  expiration?: Date;
}): Message | undefined => {
  if (
    !messages?.length ||
    !expiration ||
    expiration < new Date() ||
    moment(expiration).diff(new Date(), 'days') < 0
  ) {
    return;
  }
  const sortedMessages = messages.sort(
    (a, b) => a.remainingDays - b.remainingDays
  );
  const message = sortedMessages.find(
    ({ remainingDays }) =>
      moment(expiration).diff(new Date(), 'hours') <= remainingDays * 24
  );
  return message;
};

export const getExpirationMessageTranslated = (
  i18n: Dictionary | undefined,
  message: Message,
  expiration: Date,
  language: string,
  serverName: Server['title'],
  serverUrl: Server['url'],
  serverVersion: Server['version']
) => {
  const applyParams = (message: string, params: Record<string, unknown>) => {
    const keys = Object.keys(params);
    const regex = new RegExp(`{{(${keys.join('|')})}}`, 'g');
    return message.replace(regex, (_, p1) => params[p1] as string);
  };

  const params = {
    instance_version: serverVersion,
    instance_ws_name: serverName,
    instance_domain: serverUrl,
    remaining_days: moment(expiration).diff(new Date(), 'days'),
    ...message?.params,
  };

  if (!message || !i18n) {
    return null;
  }

  const i18nLang = i18n[language] ?? i18n.en;

  const getTranslation = (key: string) =>
    key && i18nLang[key] ? applyParams(i18nLang[key], params) : undefined;

  const translatedMessage = {
    title: getTranslation(message.title),
    subtitle: getTranslation(message.subtitle),
    description: getTranslation(message.description),
    link: message.link,
  };

  return translatedMessage;
};

export const isServerVersionSupported = async (
  server: Server,
  supportedVersionsData?: SupportedVersions
): Promise<{
  supported: boolean;
  message?: Message | undefined;
  i18n?: Dictionary | undefined;
  expiration?: Date | undefined;
}> => {
  const builtInSupportedVersions = await getBuiltinSupportedVersions();

  const versions = supportedVersionsData?.versions;
  const exceptions = supportedVersionsData?.exceptions;
  const serverVersion = server.version;
  if (!serverVersion) return { supported: false };
  if (!versions) return { supported: false };

  const serverVersionTilde = `~${serverVersion
    .split('.')
    .slice(0, 2)
    .join('.')}`;

  if (!supportedVersionsData) return { supported: false };

  const exception = exceptions?.versions?.find(({ version }) =>
    satisfies(coerce(version)?.version ?? '', serverVersionTilde)
  );

  if (exception) {
    if (new Date(exception.expiration) > new Date()) {
      const messages =
        exception?.messages ||
        exceptions?.messages ||
        builtInSupportedVersions?.messages;
      const selectedExpirationMessage = getExpirationMessage({
        messages,
        expiration: exception.expiration,
      }) as Message;

      return {
        supported: true,
        message: selectedExpirationMessage,
        i18n: selectedExpirationMessage
          ? supportedVersionsData?.i18n
          : undefined,
        expiration: exception.expiration,
      };
    }
  }

  const supportedVersion = versions.find(({ version }) =>
    satisfies(coerce(version)?.version ?? '', serverVersionTilde)
  );

  if (supportedVersion) {
    if (new Date(supportedVersion.expiration) > new Date()) {
      const messages =
        supportedVersionsData?.messages || builtInSupportedVersions?.messages;

      const selectedExpirationMessage = getExpirationMessage({
        messages,
        expiration: supportedVersion.expiration,
      }) as Message;

      return {
        supported: true,
        message: selectedExpirationMessage,
        i18n: selectedExpirationMessage
          ? supportedVersionsData?.i18n
          : undefined,
        expiration: supportedVersion.expiration,
      };
    }
  }

  const enforcementStartDate = new Date(
    supportedVersionsData?.enforcementStartDate
  );
  if (enforcementStartDate > new Date()) {
    const selectedExpirationMessage = getExpirationMessage({
      messages: supportedVersionsData.messages,
      expiration: enforcementStartDate,
    }) as Message;

    return {
      supported: true,
      message: selectedExpirationMessage,
      i18n: selectedExpirationMessage ? supportedVersionsData?.i18n : undefined,
      expiration: enforcementStartDate,
    };
  }
  return { supported: false };
};

const dispatchVersionUpdated = (url: string) => (info: ServerInfo) => {
  dispatch({
    type: WEBVIEW_SERVER_VERSION_UPDATED,
    payload: {
      url,
      version: info.version,
    },
  });

  return info;
};

const dispatchUniqueIdUpdated = (url: string) => (uniqueID: string | null) => {
  if (uniqueID) {
    dispatch({
      type: WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
      payload: {
        url,
        uniqueID,
      },
    });
  }

  return uniqueID;
};

const dispatchSupportedVersionsUpdated = (
  url: string,
  supportedVersions: SupportedVersions,
  { source }: { source: 'server' | 'cloud' | 'builtin' }
): void => {
  dispatch({
    type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
    payload: {
      url,
      supportedVersions,
      source,
    },
  });
};

const updateSupportedVersionsData = async (
  serverUrl: string
): Promise<void> => {
  const builtinSupportedVersions = await getBuiltinSupportedVersions();

  const server = select(({ servers }) =>
    servers.find((server) => server.url === serverUrl)
  );
  if (!server) return;

  const serverInfo = await getServerInfo(server.url)
    .then(dispatchVersionUpdated(server.url))
    .catch(logRequestError('server info'));
  if (!serverInfo) return;

  const uniqueID = await getUniqueId(server.url, server.version || '')
    .then(dispatchUniqueIdUpdated(server.url))
    .catch(logRequestError('unique ID'));

  const serverEncoded = serverInfo.supportedVersions?.signed;

  if (!serverEncoded) {
    if (!uniqueID) {
      if (!builtinSupportedVersions) return;

      dispatchSupportedVersionsUpdated(server.url, builtinSupportedVersions, {
        source: 'builtin',
      });
      return;
    }

    const cloudInfo = await getCloudInfo(server.url, uniqueID).catch(
      logRequestError('cloud info')
    );
    const cloudEncoded = cloudInfo?.signed;
    if (!cloudEncoded) return;

    const cloudSupportedVersions = decodeSupportedVersions(cloudEncoded);
    dispatchSupportedVersionsUpdated(server.url, cloudSupportedVersions, {
      source: 'cloud',
    });
    return;
  }

  const serverSupportedVersions = decodeSupportedVersions(serverEncoded);

  if (!builtinSupportedVersions) {
    dispatchSupportedVersionsUpdated(server.url, serverSupportedVersions, {
      source: 'server',
    });
    return;
  }

  const builtinTimetamp = Date.parse(builtinSupportedVersions.timestamp);
  const serverTimestamp = Date.parse(serverSupportedVersions.timestamp);

  if (serverTimestamp > builtinTimetamp) {
    dispatchSupportedVersionsUpdated(server.url, serverSupportedVersions, {
      source: 'server',
    });
    return;
  }

  dispatchSupportedVersionsUpdated(server.url, builtinSupportedVersions, {
    source: 'builtin',
  });
};

export function checkSupportedVersionServers(): void {
  listen(WEBVIEW_READY, async (action) => {
    updateSupportedVersionsData(action.payload.url);
  });

  listen(SUPPORTED_VERSION_DIALOG_DISMISS, async (action) => {
    updateSupportedVersionsData(action.payload.url);
  });

  listen(WEBVIEW_SERVER_RELOADED, async (action) => {
    updateSupportedVersionsData(action.payload.url);
  });

  ipcMain.handle('refresh-supported-versions', async (_event, serverUrl) => {
    updateSupportedVersionsData(serverUrl);
  });
}
