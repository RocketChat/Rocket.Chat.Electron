import type { Certificate } from 'electron';

import type { Server } from '../types/Server';

export const CERTIFICATES_CLEARED = 'certificates/cleared';
export const CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED =
  'certificates/client-certificate-requested';
export const CERTIFICATES_UPDATED = 'certificates/updated';
export const SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED =
  'select-client-certificate-dialog/certificate-selected';
export const SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED =
  'select-client-certificate-dialog/dismissed';
export const EXTERNAL_PROTOCOL_PERMISSION_UPDATED =
  'navigation/external-protocol-permission-updated';

export type NavigationActionTypeToPayloadMap = {
  [CERTIFICATES_CLEARED]: void;
  [CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED]: Certificate[];
  [CERTIFICATES_UPDATED]: Record<Server['url'], Certificate['fingerprint']>;
  [SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED]: Certificate['fingerprint'];
  [SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED]: void;
  [EXTERNAL_PROTOCOL_PERMISSION_UPDATED]: {
    protocol: string;
    allowed: boolean;
  };
};
