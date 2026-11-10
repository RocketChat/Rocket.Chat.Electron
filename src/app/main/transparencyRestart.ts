import { dispatch, listen, select } from '../../store';
import { SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED } from '../../ui/actions';
import { askForTransparencyRestart } from '../../ui/main/dialogs';
import { selectPersistableValues } from '../selectors';
import { relaunchApp } from './app';
import { flushPersistedValues, persistValues } from './persistence';

/**
 * macOS cannot change the native transparency of an open root window, so a
 * change of the setting needs a restart. Ask first: Cancel restores the value
 * that the window was created with, and Restart now saves the new value before
 * the relaunch.
 *
 * Call it after the persisted settings are loaded, because it keeps the value
 * at that moment as the one the root window uses.
 *
 * This lives outside `app.ts` on purpose. Many modules import `app.ts`, and
 * `persistence` loads `electron-log`, which registers an IPC handler that a
 * second load (after `jest.resetModules()`) rejects.
 */
export const setupTransparencyRestart = (): void => {
  const originalTransparency = select(
    ({ isTransparentWindowEnabled }) => isTransparentWindowEnabled
  );
  let isTransparencyRestartPending = false;

  listen(SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED, async () => {
    if (
      process.platform !== 'darwin' ||
      isTransparencyRestartPending ||
      select(({ isTransparentWindowEnabled }) => isTransparentWindowEnabled) ===
        originalTransparency
    ) {
      return;
    }

    isTransparencyRestartPending = true;
    const revertTransparency = (): void => {
      dispatch({
        type: SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED,
        payload: originalTransparency,
      });
      persistValues(select(selectPersistableValues));
      flushPersistedValues();
    };

    try {
      if (!(await askForTransparencyRestart())) {
        revertTransparency();
        return;
      }

      if (
        select(
          ({ isTransparentWindowEnabled }) => isTransparentWindowEnabled
        ) === originalTransparency
      ) {
        return;
      }

      persistValues(select(selectPersistableValues));
      flushPersistedValues();
      relaunchApp();
    } catch (error) {
      console.warn('Could not confirm transparency restart:', error);
      revertTransparency();
    } finally {
      isTransparencyRestartPending = false;
    }
  });
};
