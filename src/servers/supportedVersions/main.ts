import fs from 'fs';
import path from 'path';

import { app } from 'electron';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import { coerce, ltr } from 'semver';

import { getLanguage } from '../../i18n/main';
import { dispatch, listen, select } from '../../store';
import {
  SUPPORTED_VERSION_DIALOG_OPEN,
  WEBVIEW_DID_NAVIGATE,
  WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
  WEBVIEW_SERVER_VERSION_UPDATED,
  SUPPORTED_VERSION_EXPIRATION_MESSAGE_UPDATED,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_SOURCE_UPDATED,
} from '../../ui/actions';
import type { Server } from '../common';
import type {
  CloudInfo,
  Dictionary,
  Message,
  MessageTranslated,
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
    let filePath;
    if (process.env.NODE_ENV === 'development') {
      filePath = path.join(__dirname, 'supportedVersions.jwt');
    } else {
      filePath = path.join(app.getAppPath(), 'supportedVersions.jwt');
    }
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

const getCloudInfo = (
  serverDomain: string,
  workspaceId: string
): CloudInfo | null => {
  console.log('Getting Cloud Info...', serverDomain, workspaceId);
  fetch(
    `https://releases.rocket.chat/v2/server/supportedVersions?domain=${serverDomain}&uniqueId=${workspaceId}&source=desktop`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Couldn't load Cloud Info: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => data as CloudInfo)
    .catch((error) => {
      console.error('Fetching Cloud Info error:', error);
      return null;
    });
  return null;
};

export const getServerInfo = (serverUrl: string): Promise<ServerInfo | null> =>
  fetch(`${serverUrl}/api/info`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Couldn't load Server Info: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => data as ServerInfo)
    .catch((error) => {
      console.error('Fetching Server Info error:', error);
      return null;
    });

const updateSupportedVersionsSource = (
  source: 'server' | 'cloud' | 'builtin',
  server: Server
): void => {
  dispatch({
    type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_SOURCE_UPDATED,
    payload: {
      url: server.url,
      supportedVersionsSource: source,
    },
  });
};

export const getSupportedVersionsData = async (
  server: Server
): Promise<SupportedVersions | null> => {
  const buildSupportedVersions = await readBuiltinSupportedVersions();
  const serverInfo = await getServerInfo(server.url);
  const serverSupportedVersions = serverInfo?.supportedVersions;

  if (!serverSupportedVersions?.signed) {
    if (server.workspaceUID) {
      const serverDomain = new URL(server.url).hostname;
      const cloudSupportedVersions = await getCloudInfo(
        serverDomain,
        server.workspaceUID
      );
      if (!cloudSupportedVersions || !cloudSupportedVersions.signed)
        return null;
      const decodedCloudSupportedVersions = decode(
        cloudSupportedVersions.signed
      ) as SupportedVersions;
      updateSupportedVersionsSource('cloud', server);
      return decodedCloudSupportedVersions;
    }
  }

  if (!serverSupportedVersions && !buildSupportedVersions) return null;

  if (!serverSupportedVersions && buildSupportedVersions) {
    updateSupportedVersionsSource('builtin', server);
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
    updateSupportedVersionsSource('builtin', server);
    return buildSupportedVersions;
  }

  updateSupportedVersionsSource('server', server);
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
    moment(expiration).diff(new Date(), 'days') < 0
  ) {
    return;
  }
  const sortedMessages = messages.sort(
    (a, b) => a.remainingDays - b.remainingDays
  );
  const message = sortedMessages.find(
    ({ remainingDays }) =>
      moment(expiration).diff(new Date(), 'days') <= remainingDays
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

  if (!message || !i18n || params.remaining_days > 15) {
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
  server: Server
): Promise<boolean> => {
  const supportedVersionsData = await getSupportedVersionsData(server);
  const builtInSupportedVersions = await readBuiltinSupportedVersions();
  const versions = supportedVersionsData?.versions;
  const exceptions = supportedVersionsData?.exceptions;
  const serverVersion = server.version;
  if (!serverVersion) return false;
  if (!versions) return false;

  const appLanguage = (await getLanguage()) ?? 'en';

  const supportedVersion = versions.find(
    ({ version }) =>
      coerce(version)?.version === coerce(server.version)?.version
  );

  if (supportedVersion) {
    if (new Date(supportedVersion.expiration) > new Date()) {
      const messages =
        supportedVersionsData?.messages || builtInSupportedVersions?.messages;
      const selectedExpirationMessage = getExpirationMessage({
        messages,
        expiration: supportedVersion.expiration,
      }) as Message;

      const translatedMessage = getExpirationMessageTranslated(
        server.supportedVersions?.i18n,
        selectedExpirationMessage,
        supportedVersion.expiration,
        appLanguage,
        server.title,
        server.url,
        server.version
      ) as MessageTranslated;

      dispatch({
        type: SUPPORTED_VERSION_EXPIRATION_MESSAGE_UPDATED,
        payload: {
          url: server.url,
          expirationMessage: translatedMessage,
        },
      });
      return true;
    }
  }

  const exception = exceptions?.versions?.find(
    ({ version }) =>
      coerce(version)?.version === coerce(server.version)?.version
  );

  if (exception) {
    if (new Date(exception.expiration) > new Date()) {
      const selectedExpirationMessage = getExpirationMessage({
        messages: exception.messages,
        expiration: exception.expiration,
      }) as Message;

      const translatedMessage = getExpirationMessageTranslated(
        server.supportedVersions?.i18n,
        selectedExpirationMessage,
        exception.expiration,
        appLanguage,
        server.title,
        server.url,
        server.version
      ) as MessageTranslated;

      dispatch({
        type: SUPPORTED_VERSION_EXPIRATION_MESSAGE_UPDATED,
        payload: {
          url: server.url,
          expirationMessage: translatedMessage,
        },
      });
      return true;
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

    const translatedMessage = getExpirationMessageTranslated(
      server.supportedVersions?.i18n,
      selectedExpirationMessage,
      enforcementStartDate,
      appLanguage,
      server.title,
      server.url,
      server.version
    ) as MessageTranslated;

    dispatch({
      type: SUPPORTED_VERSION_EXPIRATION_MESSAGE_UPDATED,
      payload: {
        url: server.url,
        expirationMessage: translatedMessage,
      },
    });
    return true;
  }

  return false;
};

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
    if (!supportedVersions) return;
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
