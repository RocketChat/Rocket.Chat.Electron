import { I18N_LNG_REQUESTED, I18N_LNG_RESPONDED } from '../actions';

describe('i18n/actions', () => {
  it('exposes expected action type constants', () => {
    expect(I18N_LNG_REQUESTED).toBe('i18n/lng-requested');
    expect(I18N_LNG_RESPONDED).toBe('i18n/lng-responded');
  });
});
