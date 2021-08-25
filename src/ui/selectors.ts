import { createSelector } from 'reselect';

import { Server } from '../servers/common';
import { RootState } from '../store/rootReducer';

export type Selector<T> = (state: RootState) => T;
export type RootSelector<T extends keyof RootState> = Selector<RootState[T]>;

export const selectGlobalBadge = ({ servers }: RootState): Server['badge'] => {
  const badges = servers.map(({ badge }) => badge);

  const mentionCount = badges
    .filter((badge): badge is number => Number.isInteger(badge))
    .reduce<number>((sum, count: number) => sum + count, 0);

  return mentionCount || (badges.some((badge) => !!badge) && '•') || undefined;
};

export const selectGlobalBadgeText = createSelector(
  selectGlobalBadge,
  (badge) => {
    if (badge === '•') {
      return '•';
    }

    if (Number.isInteger(badge)) {
      return String(badge);
    }

    return '';
  }
);

const isBadgeCount = (badge: Server['badge']): badge is number =>
  Number.isInteger(badge);

export const selectGlobalBadgeCount = createSelector(
  selectGlobalBadge,
  (badge): number => (isBadgeCount(badge) ? badge : 0)
);
