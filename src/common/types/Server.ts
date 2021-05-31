import type { SystemIdleState } from './SystemIdleState';

export type Server = {
  url: string;
  version?: string;
  badge?: '•' | number;
  favicon?: string;
  style?: {
    background: string | null;
    color: string | null;
  };
  title?: string;
  presence?:
    | {
        autoAwayEnabled: false;
      }
    | {
        autoAwayEnabled: true;
        idleThreshold: number | null;
        idleState: SystemIdleState;
      };
  lastPath?: string;
  failed?: boolean;
  webContentsId?: number;
};
