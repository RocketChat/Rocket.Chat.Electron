import { SPELL_CHECKING_LANGUAGE_TOGGLED } from './actions';
import { setupSpellChecking } from './main';
import { createMainReduxStore, dispatch } from '../store';

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
