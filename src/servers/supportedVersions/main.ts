import fs from 'fs';
import path from 'path';

import axios from 'axios';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import { coerce, satisfies } from 'semver';

import { dispatch, listen, select } from '../../store';
import {
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
  WEBVIEW_SERVER_VERSION_UPDATED,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_SOURCE_UPDATED,
  WEBVIEW_READY,
  WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
  WEBVIEW_SERVER_RELOADED,
  SUPPORTED_VERSION_DIALOG_DISMISS,
} from '../../ui/actions';
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

export function decode(token: string) {
  if (!publicKey) {
    return jwt.decode(token);
  }
  const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  return decoded;
}

export async function readBuiltinSupportedVersions(): Promise<SupportedVersions | null> {
  try {
    const filePath = path.join(__dirname, 'supportedVersions.jwt');
    const builtinSupportedVersionsJWT = await fs.promises.readFile(
      filePath,
      'utf8'
    );
    return decode(builtinSupportedVersionsJWT) as SupportedVersions;
  } catch (e) {
    console.log('Error loading supportedVersions.jwt', e);
    return null;
  }
}

const getUniqueId = async (serverUrl: string): Promise<string> => {
  try {
    const response = await axios.get(
      `${serverUrl}/api/v1/settings.public?query={"_id": "uniqueID"}`
    );
    return response.data?.settings?.[0]?.value;
  } catch (error) {
    console.error('Error fetching unique ID:', error);
    throw error;
  }
};

const getCloudInfo = (
  serverDomain: string,
  uniqueID: string
): Promise<CloudInfo | null> =>
  axios
    .get(
      `https://releases.rocket.chat/v2/server/supportedVersions?domain=${serverDomain}&uniqueId=${uniqueID}&source=desktop`
    )
    .then((response) => response.data as CloudInfo)
    .catch((error) => {
      if (error.response) {
        console.log(`Couldn't load Cloud Info: ${error.response.status}`);
      } else {
        console.error('Fetching Cloud Info error:', error.message);
      }
      return null;
    });

export const getServerInfo = (serverUrl: string): Promise<ServerInfo | null> =>
  axios
    .get(`${serverUrl}api/info`)
    .then((response) => response.data as ServerInfo)
    .catch((error) => {
      if (error.response) {
        console.log(`Couldn't load Server Info: ${error.response.status}`);
      } else {
        console.error('Fetching Server Info error:', error.message);
      }
      return null;
    });

const updateSupportedVersionsSource = (
  source: 'server' | 'cloud' | 'builtin',
  serverUrl: string
): void => {
  dispatch({
    type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_SOURCE_UPDATED,
    payload: {
      url: serverUrl,
      supportedVersionsSource: source,
    },
  });
};

export const getSupportedVersionsData = async (
  serverUrl: string,
  serverUniqueID: string
): Promise<SupportedVersions | null> => {
  const buildSupportedVersions = await readBuiltinSupportedVersions();
  const serverInfo = await getServerInfo(serverUrl);
  const serverSupportedVersions = serverInfo?.supportedVersions;

  if (!serverSupportedVersions?.signed) {
    if (serverUniqueID) {
      const serverDomain = new URL(serverUrl).hostname;
      const cloudSupportedVersions = await getCloudInfo(
        serverDomain,
        serverUniqueID
      );
      if (cloudSupportedVersions?.signed) {
        const decodedCloudSupportedVersions = decode(
          cloudSupportedVersions.signed
        ) as SupportedVersions;
        updateSupportedVersionsSource('cloud', serverUrl);
        return decodedCloudSupportedVersions;
      }
    }
  }

  if (!serverSupportedVersions && !buildSupportedVersions) return null;

  if (!serverSupportedVersions && buildSupportedVersions) {
    updateSupportedVersionsSource('builtin', serverUrl);
    return buildSupportedVersions;
  }

  if (!serverSupportedVersions?.signed) return null;

  const decodedServerSupportedVersions = decode(
    serverSupportedVersions.signed
  ) as SupportedVersions;

  if (
    decodedServerSupportedVersions &&
    decodedServerSupportedVersions &&
    buildSupportedVersions &&
    decodedServerSupportedVersions?.timestamp <
      buildSupportedVersions?.timestamp
  ) {
    updateSupportedVersionsSource('builtin', serverUrl);
    return buildSupportedVersions;
  }

  updateSupportedVersionsSource('server', serverUrl);
  if (decodedServerSupportedVersions) return decodedServerSupportedVersions;
  return null;
};

export const getExpirationMessage = ({
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
  const builtInSupportedVersions = await readBuiltinSupportedVersions();

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

const updateSupportedVersionsData = async (
  serverUrl: string
): Promise<void> => {
  const server = select(({ servers }) => servers).find(
    (server) => server.url === serverUrl
  );
  if (!server) return;
  const serverInfo = await getServerInfo(server.url);
  if (!serverInfo) return;
  dispatch({
    type: WEBVIEW_SERVER_VERSION_UPDATED,
    payload: {
      url: server.url,
      version: serverInfo.version,
    },
  });
  const uniqueID = await getUniqueId(server.url);
  dispatch({
    type: WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
    payload: {
      url: server.url,
      uniqueID,
    },
  });

  const supportedVersions = await getSupportedVersionsData(
    server.url,
    uniqueID
  );
  if (!supportedVersions) return;
  dispatch({
    type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
    payload: {
      url: server.url,
      supportedVersions,
    },
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
}
