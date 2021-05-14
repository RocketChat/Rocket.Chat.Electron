export const SYSTEM_LOCKING_SCREEN = 'system/locking-screen';
export const SYSTEM_SUSPENDING = 'system/suspending';

export type UserPresenceActionTypeToPayloadMap = {
  [SYSTEM_LOCKING_SCREEN]: void;
  [SYSTEM_SUSPENDING]: void;
};
