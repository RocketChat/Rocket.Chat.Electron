import type { PowerMonitor } from 'electron';

export type SystemIdleState = ReturnType<PowerMonitor['getSystemIdleState']>;
