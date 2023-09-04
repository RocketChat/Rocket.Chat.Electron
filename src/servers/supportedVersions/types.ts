import fs from 'fs';

import jwt from 'jsonwebtoken';
import { satisfies } from 'semver';

import type { Server } from '../common';
import { sampleCloudInfo, sampleServerSupportedVersions } from './samples';

export type SerializedJWT<T> = string;

export type LTSDictionary = {
  [lng: string]: Record<string, string>;
};

export type LTSMessage = {
  remainingDays: number;
  message: 'message_token';
  type: 'info' | 'alert' | 'error';
  params: Record<string, unknown>;
};

export type LTSVersion = {
  version: string;
  expiration: Date;
  messages?: LTSMessage[];
};

export interface LTSSupportedVersions {
  timestamp: string;
  messages?: LTSMessage[];
  versions: LTSVersion[];
  exceptions?: {
    domain: string;
    uniqueId: string;
    messages?: LTSMessage[];
    versions: LTSVersion[];
  };
  i18n?: LTSDictionary;
}

export interface LTSServerInfo {
  version: string;
  success: boolean;
  supportedVersions?: SerializedJWT<LTSSupportedVersions>;
  minimumClientVersions?: {
    desktop: string;
    mobile: string;
  };
}

export interface LTSCloudInfo {
  signed: SerializedJWT<LTSSupportedVersions>;
  timestamp: string;
  messages?: LTSMessage[];
  versions: LTSVersion[];
  exceptions?: {
    domain: string;
    uniqueId: string;
    messages?: LTSMessage[];
    versions: LTSVersion[];
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

function readBuiltinSupportedVersions(): LTSSupportedVersions {
  try {
    const builtinSupportedVersionsJWT = fs.readFileSync(
      'supportedVersions.jwt',
      'utf8'
    );
    return decode(builtinSupportedVersionsJWT) as LTSSupportedVersions;
  } catch (e) {
    console.log('Error loading supportedVersions.jwt', e);
    return sampleServerSupportedVersions;
  }
}

const getLTSCloudInfo = (_workspaceId: string): LTSSupportedVersions => {
  // get cloud info from server
  const cloudInfo = sampleCloudInfo;
  const decoded = decode(cloudInfo.signed) as LTSSupportedVersions;
  return decoded;
};

export const getLTSServerInfo = (
  serverUrl: string
): Promise<LTSServerInfo | null> =>
  fetch(`${serverUrl}/api/info`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Couldn't load Server Info: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log(data);
      return data as LTSServerInfo;
    })
    .catch((error) => {
      console.error('Fetching Server Info error:', error);
      return null;
    });

const getSupportedVersionsData = async (
  server: Server
): Promise<LTSSupportedVersions> => {
  const { supportedVersions } = server;
  const buildSupportedVersions = await readBuiltinSupportedVersions();
  if (!supportedVersions || !server.workspaceUID) {
    return buildSupportedVersions;
  }
  if (!supportedVersions || server.workspaceUID) {
    const cloudInfo = await getLTSCloudInfo(server.workspaceUID);
    return cloudInfo;
  }
  const decodedServerSupportedVersions = decode(
    supportedVersions
  ) as LTSSupportedVersions;
  if (
    !decodedServerSupportedVersions ||
    decodedServerSupportedVersions.timestamp < buildSupportedVersions?.timestamp
  )
    return buildSupportedVersions;

  return decodedServerSupportedVersions;
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
      return true;
    }
  }

  const exception = exceptions?.versions.find(({ version }) =>
    satisfies(version, serverVersionTilde)
  );

  if (exception) {
    if (new Date(exception.expiration) > new Date()) {
      return true;
    }
  }

  return false;
};
