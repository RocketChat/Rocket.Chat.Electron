import { app } from 'electron';

import { handle } from '../../ipc/main';

export const setupSecureKeyboardEntry = (): (() => void) => {
  if (process.platform !== 'darwin') {
    return () => undefined;
  }

  const removeHandler = handle(
    'secure-keyboard-entry/set',
    async (_, enabled) => {
      app.setSecureKeyboardEntryEnabled(enabled);
    }
  );

  return removeHandler;
};
