import type { BrowserWindow } from 'electron';

import { watch } from '../../store';

const recreatingWindows = new WeakSet<BrowserWindow>();

export const isRecreatingSecondaryWindow = (window: BrowserWindow): boolean =>
  recreatingWindows.has(window);

/** Native transparency is immutable, so recreate only open macOS windows. */
export const watchSecondaryWindowTransparency = ({
  getWindow,
  reopen,
  isQuitting,
  waitForCreation,
}: {
  getWindow: () => BrowserWindow | null;
  reopen: () => Promise<void>;
  isQuitting: () => boolean;
  waitForCreation: () => Promise<void> | null;
}): void => {
  if (process.platform !== 'darwin') return;

  let generation = 0;
  let pending = Promise.resolve();
  watch(
    ({ isTransparentWindowEnabled }) => isTransparentWindowEnabled,
    (_enabled, previous) => {
      if (previous === undefined) return;
      const currentGeneration = ++generation;
      pending = pending
        .then(async () => {
          if (currentGeneration !== generation || isQuitting()) return;
          await waitForCreation();
          if (currentGeneration !== generation || isQuitting()) return;
          const window = getWindow();
          if (!window || window.isDestroyed()) return;

          const bounds = window.getNormalBounds();
          const minimized = window.isMinimized();
          recreatingWindows.add(window);
          try {
            await new Promise<void>((resolve) => {
              window.once('closed', () => resolve());
              window.close();
            });
          } finally {
            recreatingWindows.delete(window);
          }
          if (isQuitting()) return;

          await reopen();
          const replacement = getWindow();
          if (!replacement || replacement.isDestroyed()) return;
          replacement.setBounds(bounds);
          if (minimized) {
            replacement.once('ready-to-show', () => {
              if (!replacement.isDestroyed()) replacement.minimize();
            });
          }
        })
        .catch((error) => {
          console.error(
            'Could not recreate secondary window appearance:',
            error
          );
        });
    }
  );
};
