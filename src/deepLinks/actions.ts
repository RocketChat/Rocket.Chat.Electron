import { Server } from '../servers/common';

export const DEEP_LINKS_SERVER_ADDED = 'deep-links/server-added';
export const DEEP_LINKS_SERVER_FOCUSED = 'deep-links/server-focused';

export type DeepLinksActionTypeToPayloadMap = {
  [DEEP_LINKS_SERVER_ADDED]: Server['url'];
  [DEEP_LINKS_SERVER_FOCUSED]: Server['url'];
};
