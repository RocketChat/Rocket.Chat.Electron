import type { Certificate } from 'electron';

import type { Server } from '../types/Server';

export const CERTIFICATES_CLEARED = 'certificates/cleared';
export const CERTIFICATES_UPDATED = 'certificates/updated';
export const EXTERNAL_PROTOCOL_PERMISSION_UPDATED =
  'navigation/external-protocol-permission-updated';

export type NavigationActionTypeToPayloadMap = {
  [CERTIFICATES_CLEARED]: void;
  [CERTIFICATES_UPDATED]: Record<Server['url'], Certificate['fingerprint']>;
  [EXTERNAL_PROTOCOL_PERMISSION_UPDATED]: {
    protocol: string;
    allowed: boolean;
  };
};
