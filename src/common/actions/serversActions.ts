import type { Server } from '../types/Server';
import type { ServerUrlResolutionResult } from '../types/ServerUrlResolutionResult';

export const SERVER_URL_RESOLUTION_REQUESTED =
  'server/url-resolution-requested';
export const SERVER_URL_RESOLVED = 'server/url-resolved';

export type ServersActionTypeToPayloadMap = {
  [SERVER_URL_RESOLUTION_REQUESTED]: Server['url'];
  [SERVER_URL_RESOLVED]: ServerUrlResolutionResult;
};
