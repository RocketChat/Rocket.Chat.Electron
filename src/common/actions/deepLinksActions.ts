import type { Server } from '../types/Server';

export const DEEP_LINKS_SERVER_ADDED = 'deep-links/server-added';

export type DeepLinksActionTypeToPayloadMap = {
  [DEEP_LINKS_SERVER_ADDED]: Server['url'];
};
