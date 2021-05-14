import { SPELL_CHECKING_LANGUAGE_TOGGLED } from '../common/actions/spellCheckingActions';
import { createMainReduxStore, dispatch } from '../common/store';
import { setupSpellChecking } from './setupSpellChecking';

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
