import type { Server, ServerUrlResolutionResult } from './common';

export const SERVERS_LOADED = 'servers/loaded';
export const SERVER_URL_RESOLUTION_REQUESTED =
  'server/url-resolution-requested';
export const SERVER_URL_RESOLVED = 'server/url-resolved';
export const SERVER_DOCUMENT_VIEWER_OPEN_URL =
  'server/document-viewer/open-url';
export const SERVER_UI_PREVIEW_CHANGED = 'server/ui-preview-changed';

export type ServersActionTypeToPayloadMap = {
  [SERVERS_LOADED]: {
    servers: Server[];
    selected: Server['url'] | null;
  };
  [SERVER_URL_RESOLUTION_REQUESTED]: Server['url'];
  [SERVER_URL_RESOLVED]: ServerUrlResolutionResult;
  [SERVER_DOCUMENT_VIEWER_OPEN_URL]: {
    server: Server['url'];
    documentUrl: string;
    documentFormat?: string;
  };
  [SERVER_UI_PREVIEW_CHANGED]: {
    url: Server['url'];
    uiPreview: string | undefined;
  };
};
