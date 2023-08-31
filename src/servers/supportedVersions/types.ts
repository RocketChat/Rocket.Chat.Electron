import fs from 'fs';

import { app } from 'electron';
import jwt from 'jsonwebtoken';

import type { Server } from '../common';
import { sampleCloudInfo, sampleServerSupportedVersions } from './samples';

export type SerializedJWT<T> = string;

export type LTSDictionary = {
  [lng: string]: Record<string, string>;
};

export type LTSMessages = {
  remainingDays: number;
  message: 'message_token';
  type: 'info' | 'alert' | 'error';
  params: Record<string, unknown>;
};

export type LTSVersion = {
  version: string;
  expiration: Date;
  messages?: LTSMessages[];
};

export interface LTSSupportedVersions {
  timestamp: string;
  messages?: LTSMessages[];
  versions: LTSVersion[];
  exceptions?: {
    domain: string;
    uniqueId: string;
    messages?: LTSMessages[];
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
  messages?: LTSMessages[];
  versions: LTSVersion[];
  exceptions?: {
    domain: string;
    uniqueId: string;
    messages?: LTSMessages[];
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

const getLTSCloudInfo = (_workspaceId: string): LTSCloudInfo => {
  // get cloud info from server
  const cloudInfo = sampleCloudInfo;
  return cloudInfo;
};

const getLTSServerInfo = (serverUrl: string): Promise<LTSServerInfo | null> =>
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
  const serverInfo = await getLTSServerInfo(server.url);
  const buildSupportedVersions = await readBuiltinSupportedVersions();
  if (!serverInfo || !serverInfo.supportedVersions || !server.workspaceUID) {
    return buildSupportedVersions;
  }
  if (!serverInfo || server.workspaceUID) {
    const cloudInfo = getLTSCloudInfo(server.workspaceUID);
    return cloudInfo;
  }
  const serverSupportedVersions = decode(
    serverInfo.supportedVersions
  ) as LTSSupportedVersions;
  if (
    !serverSupportedVersions ||
    serverSupportedVersions.timestamp < buildSupportedVersions?.timestamp
  )
    return readBuiltinSupportedVersions();

  return serverSupportedVersions;
};

export const isServerVersionSupported = async (
  server: Server
): Promise<boolean> => {
  const serverInfo = await getLTSServerInfo(server.url);
  if (!serverInfo) return false;
  if (
    serverInfo.minimumClientVersions?.desktop &&
    serverInfo.minimumClientVersions?.desktop > app.getVersion()
  )
    return false;
  const decodedSupportedVersions = await getSupportedVersionsData(server);
  const supportedVersion = decodedSupportedVersions.versions.find(
    ({ version }) => version === serverInfo.version
  );
  if (!supportedVersion) return false;
  return true;
};
