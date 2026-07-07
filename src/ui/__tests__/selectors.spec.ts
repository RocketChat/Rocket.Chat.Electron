import type { RootState } from '../../store/rootReducer';
import {
  selectGlobalBadge,
  selectGlobalBadgeCount,
  selectGlobalBadgeText,
} from '../selectors';

const state = (servers: any[]): RootState =>
  ({ servers }) as unknown as RootState;

describe('ui/selectors', () => {
  it('computes a numeric global badge from server badge counts', () => {
    expect(selectGlobalBadge(state([{ badge: 2 }, { badge: 3 }]))).toBe(5);
    expect(selectGlobalBadgeCount(state([{ badge: 2 }, { badge: '•' }]))).toBe(
      2
    );
  });

  it('returns bullet when no numeric sum but at least one bullet is present', () => {
    expect(selectGlobalBadge(state([{ badge: '•' }, { badge: null }]))).toBe(
      '•'
    );
    expect(selectGlobalBadgeText(state([{ badge: '•' }]))).toBe('•');
  });

  it('returns undefined for no matching badges and empty badge text when blank', () => {
    expect(
      selectGlobalBadge(state([{ badge: null }, { badge: undefined }]))
    ).toBeUndefined();
    expect(selectGlobalBadgeText(state([{ badge: null }]))).toBe('');
  });

  it('renders badge text for number badge and count selector', () => {
    expect(selectGlobalBadgeText(state([{ badge: 9 }]))).toBe('9');
    expect(selectGlobalBadgeCount(state([{ badge: '•' }, { badge: 7 }]))).toBe(
      7
    );
  });
});
