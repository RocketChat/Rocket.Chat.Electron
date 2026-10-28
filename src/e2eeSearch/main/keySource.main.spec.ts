import { app } from 'electron';

import { selectAppKeySource } from '../keySource';

describe('selectAppKeySource', () => {
  const MEMORY_ONLY = { ROCKETCHAT_E2EE_SEARCH_MEMORY_ONLY: 'true' };

  // In a dev build, setupUpdates (src/updates/main.ts) replaces the
  // `app.isPackaged` getter with one that always returns true, so that
  // electron-updater runs. The dev key switches must still work after it.
  it('keeps the dev switches after the dev-mode isPackaged patch of setupUpdates', () => {
    const own = Object.getOwnPropertyDescriptor(app, 'isPackaged');
    Object.defineProperty(app, 'isPackaged', {
      configurable: true,
      get: () => true,
    });
    try {
      expect(selectAppKeySource('development', MEMORY_ONLY)).toBe(
        'memory-only'
      );
    } finally {
      if (own) Object.defineProperty(app, 'isPackaged', own);
      else delete (app as { isPackaged?: boolean }).isPackaged;
    }
  });

  it('ignores the dev switches outside a development build', () => {
    expect(selectAppKeySource('production', MEMORY_ONLY)).toBe('os-keychain');
  });
});
