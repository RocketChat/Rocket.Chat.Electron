jest.mock('../store', () => ({
  createMainReduxStore: jest.fn(),
  dispatch: jest.fn(),
  listen: jest.fn(),
}));

jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(async () => undefined),
  },
  session: {
    defaultSession: {
      availableSpellCheckerLanguages: ['en-US'],
      setSpellCheckerLanguages: jest.fn(),
      getSpellCheckerLanguages: jest.fn(() => ['en-US']),
    },
  },
  webContents: {
    getAllWebContents: jest.fn(() => []),
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
