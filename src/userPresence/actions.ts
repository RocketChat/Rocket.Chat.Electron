import { powerMonitor } from 'electron';

export const SYSTEM_IDLE_STATE_REQUESTED = 'system/idle-state-resquested';
export const SYSTEM_IDLE_STATE_RESPONDED = 'system/idle-state-responded';
export const SYSTEM_LOCKING_SCREEN = 'system/locking-screen';
export const SYSTEM_SUSPENDING = 'system/suspending';

export type UserPresenceActionTypeToPayloadMap = {
  [SYSTEM_IDLE_STATE_REQUESTED]: number;
  [SYSTEM_IDLE_STATE_RESPONDED]: ReturnType<typeof powerMonitor.getSystemIdleState>;
  [SYSTEM_LOCKING_SCREEN]: never;
  [SYSTEM_LOCKING_SCREEN]: never;
  [SYSTEM_SUSPENDING]: never;
  [SYSTEM_SUSPENDING]: never;
};
