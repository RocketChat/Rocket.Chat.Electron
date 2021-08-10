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
