import { ValidationResult, Server } from './common';

export const SERVERS_LOADED = 'servers/loaded';
export const SERVER_VALIDATION_REQUESTED = 'server/validation-requested';
export const SERVER_VALIDATION_RESPONDED = 'server/validation-responded';

export type ServersActionTypeToPayloadMap = {
  [SERVERS_LOADED]: {
    servers: Server[];
    currentServerUrl: Server['url'];
  };
  [SERVER_VALIDATION_REQUESTED]: {
    serverUrl: Server['url'];
    timeout?: number;
  };
  [SERVER_VALIDATION_RESPONDED]: ValidationResult;
};
