import { ValidationResult, Server } from './common';

export const SERVER_VALIDATION_REQUESTED = 'server/validation-requested';
export const SERVER_VALIDATION_RESPONDED = 'server/validation-responded';

export type ServersActionTypeToPayloadMap = {
  [SERVER_VALIDATION_REQUESTED]: { serverUrl: Server['url'], timeout?: number };
  [SERVER_VALIDATION_RESPONDED]: ValidationResult;
};
