import { app } from 'electron';

import { selectKeySource } from './devTestKey';
import type { KeySource } from './devTestKey';

// In a dev build, setupUpdates (src/updates/main.ts) replaces the
// `app.isPackaged` getter with one that always returns true, so that
// electron-updater runs. Read the real value once, at module load: main.ts
// imports this module before it calls setupUpdates. Without it, the dev key
// switches stop working as soon as the updater starts.
export const isActuallyPackaged = app.isPackaged;

export const selectAppKeySource = (
  nodeEnv: string | undefined,
  env: Record<string, string | undefined>
): KeySource => selectKeySource(nodeEnv, env, isActuallyPackaged);
