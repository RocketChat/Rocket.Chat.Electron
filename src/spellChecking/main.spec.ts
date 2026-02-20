// Mock electron's ipcMain and session before any imports
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
  },
  app: {
    whenReady: jest.fn().mockResolvedValue(undefined),
  },
  session: {
    defaultSession: {
      getSpellCheckerLanguages: jest.fn().mockReturnValue(['en-US']),
      setSpellCheckerLanguages: jest.fn(),
      availableSpellCheckerLanguages: ['en-US', 'es', 'fr', 'de'],
    },
  },
  webContents: {
    getAllWebContents: jest.fn().mockReturnValue([]),
  },
}));

import { createMainReduxStore, dispatch } from '../store';
import { SPELL_CHECKING_LANGUAGE_TOGGLED } from './actions';
import { setupSpellChecking } from './main';

describe('setupSpellChecking', () => {
  beforeAll(() => {
    createMainReduxStore();
  });

  it('works', async () => {
    await setupSpellChecking();
  });

  it('handles invalid languages', async () => {
    await setupSpellChecking();
    dispatch({
      type: SPELL_CHECKING_LANGUAGE_TOGGLED,
      payload: {
        name: 'wtf',
        enabled: true,
      },
    });
  });
});
