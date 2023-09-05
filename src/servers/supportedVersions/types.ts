import fs from 'fs';

import jwt from 'jsonwebtoken';
import moment from 'moment';
import { satisfies } from 'semver';

import { dispatch } from '../../store';
import { SUPPORTED_VERSION_EXPIRATION_MESSAGE_UPDATED } from '../../ui/actions';
import type { Server } from '../common';
import {
  builtinSupportedVersions,
  builtinSupportedVersionsJWT,
  sampleCloudInfo,
  sampleServerSupportedVersions,
} from './samples';

export type SerializedJWT<T> = string;

export type Dictionary = {
  [lng: string]: Record<string, string>;
};

export type Message = {
  remainingDays: number;
  title: 'message_token';
  subtitle: 'message_token';
  description: 'message_token';
  type: 'info' | 'alert' | 'error';
  params: Record<string, unknown> & {
    instance_ws_name: string;
    instance_username: string;
    instance_email: string;
    instance_domain: string;
    remaining_days: number;
  };
  link: string;
};

export type Version = {
  version: string;
  expiration: Date;
  messages?: Message[];
};

export interface SupportedVersions {
  timestamp: string;
  messages?: Message[];
  versions: Version[];
  exceptions?: {
    domain: string;
    uniqueId: string;
    messages?: Message[];
    versions: Version[];
  };
  i18n?: Dictionary;
}

export interface ServerInfo {
  info?: {
    // only for authenticated users
    version: string;
    build: {
      date: string;
      nodeVersion: string;
      arch: string;
      platform: string;
      osRelease: string;
      totalMemory: number;
      freeMemory: number;
      cpus: number;
    };
    marketplaceApiVersion: string;
    commit: {
      hash: string;
      date: Date;
      author: string;
      subject: string;
      tag: string;
      branch: string;
    };
  };
  success: boolean;
  supportedVersions?: SerializedJWT<SupportedVersions>;
  minimumClientVersions?: {
    desktop: string;
    mobile: string;
  };
}

export interface CloudInfo {
  signed: SerializedJWT<SupportedVersions>;
  timestamp: string;
  messages?: Message[];
  versions: Version[];
  exceptions?: {
    domain: string;
    uniqueId: string;
    messages?: Message[];
    versions: Version[];
  };
}

const publicKey = `
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEArbSdeyXHhgBAX93ndDDxCuMhIh9XYCJUHG+vGNKzl4i16W5Fj5bua5gSxbIdhl0S7BtYJM3trpp7vnf3Cp6+tFoyKREYr8D/sdznSv7nRgZGgcuwZpXwf3bPN69dPPZvKS9exhlQ13nn1kOUYOgRwOrdZ8sFzJTasKeTCEjEZa4UFU4Q5lvJGOQt7hA3TvFmH4RUQC7Cu8GgHfUQD4fDuRqG4KFteTOJABpvXqJJG7DWiX6N5ssh2qRoaoapK7E+bTYWAzQnR9eAFV1ajCjhm2TqmUbAKWCM2X27ArsCJ9SWzDIj7sAm0G3DtbUKnzCDmZQHXlxcXcMDqWb8w+JQFs8b4pf56SmZn1Bro7TxdXBEgRQCTck1hginBTKciuh8gbv71bLyjPxOxnAQaukxhYpZPJAFrsfps0vKp1EPwNTboDLHHeuGSeaBP/c8ipHqPmraFLR78O07EdsCzJpBvggG7GcgSikjWDjK/eIdsUro7BKFmxjrmT72dmr7Ero9cmtd1aO/6PAenwHafCKnaxGcIGLUCNOXhk+uTPoV2LrN4L5LN75NNu6hd5L4++ngjwVsGsX3JP3seFPaZ2C76TD+Rd6OT+8guZFCGjPzXbDAb6ScQUJb11pyyLooPkz7Xdy5fCBRoeIWtjs6UwH4n57SJ/gkzkmUykX0WT3wqhkCAwEAAQ==
-----END PUBLIC KEY-----`;

function decode(token: string) {
  const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  return decoded;
}

function readBuiltinSupportedVersions(): SupportedVersions {
  try {
    // const builtinSupportedVersionsJWT = fs.readFileSync(
    //   'supportedVersions.jwt',
    //   'utf8'
    // );
    return decode(builtinSupportedVersionsJWT) as SupportedVersions;
  } catch (e) {
    console.log('Error loading supportedVersions.jwt', e);
    return sampleServerSupportedVersions;
  }
}

const getCloudInfo = (_workspaceId: string): SupportedVersions => {
  // get cloud info from server
  const cloudInfo = sampleCloudInfo;
  const decoded = decode(cloudInfo.signed) as SupportedVersions;
  return decoded;
};

export const getServerInfo = (serverUrl: string): Promise<ServerInfo | null> =>
  fetch(`${serverUrl}/api/info`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Couldn't load Server Info: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log(data);
      return data as ServerInfo;
    })
    .catch((error) => {
      console.error('Fetching Server Info error:', error);
      return null;
    });

export const getSupportedVersionsData = async (
  server: Server
): Promise<SupportedVersions> => {
  const { supportedVersions } = server;
  const buildSupportedVersions = await readBuiltinSupportedVersions();
  if (!supportedVersions || !server.workspaceUID) {
    return buildSupportedVersions;
  }
  if (!supportedVersions || server.workspaceUID) {
    const cloudInfo = await getCloudInfo(server.workspaceUID);
    return cloudInfo;
  }
  // const decodedServerSupportedVersions = decode(
  //   supportedVersions
  // ) as SupportedVersions;
  const decodedServerSupportedVersions = supportedVersions;
  if (
    !decodedServerSupportedVersions ||
    decodedServerSupportedVersions.timestamp < buildSupportedVersions?.timestamp
  )
    return buildSupportedVersions;

  return decodedServerSupportedVersions;
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
  console.log('sortedMessages', sortedMessages);
  const message = sortedMessages.find(
    ({ remainingDays }) =>
      moment(expiration).diff(new Date(), 'days') <= remainingDays
  );

  console.log('getExpirationMessage', message);
  return message;
};

export const isServerVersionSupported = async (
  server: Server
): Promise<boolean> => {
  const { versions, exceptions } = await getSupportedVersionsData(server);
  const serverVersion = server.version;
  if (!serverVersion) return false;

  // 1.2.3 -> ~1.2
  const serverVersionTilde = `~${serverVersion
    .split('.')
    .slice(0, 2)
    .join('.')}`;

  const supportedVersion = versions.find(({ version }) =>
    satisfies(version, serverVersionTilde)
  );

  if (supportedVersion) {
    if (new Date(supportedVersion.expiration) > new Date()) {
      dispatch({
        type: SUPPORTED_VERSION_EXPIRATION_MESSAGE_UPDATED,
        payload: {
          url: server.url,
          expirationMessage: getExpirationMessage({
            messages: supportedVersion.messages,
            expiration: supportedVersion.expiration,
          }),
        },
      });
      return true;
    }
  }

  const exception = exceptions?.versions.find(({ version }) =>
    satisfies(version, serverVersionTilde)
  );

  if (exception) {
    if (new Date(exception.expiration) > new Date()) {
      dispatch({
        type: SUPPORTED_VERSION_EXPIRATION_MESSAGE_UPDATED,
        payload: {
          url: server.url,
          expirationMessage: getExpirationMessage({
            messages: exception.messages,
            expiration: exception.expiration,
          }),
        },
      });
      return true;
    }
  }

  return false;
};
