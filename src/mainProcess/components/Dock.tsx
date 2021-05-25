import { app } from 'electron';
import { useEffect } from 'react';

import {
  selectGlobalBadgeCount,
  selectGlobalBadgeText,
} from '../../common/badgeSelectors';
import { useAppSelector } from '../../common/hooks/useAppSelector';
import { usePrevious } from '../../common/hooks/usePrevious';

const Dock = (): null => {
  const globalBadgeText = useAppSelector(selectGlobalBadgeText);
  const globalBadgeCount = useAppSelector(selectGlobalBadgeCount);
  const prevGlobalBadgeCount = usePrevious(globalBadgeCount) ?? 0;

  useEffect(() => {
    app.dock.setBadge(globalBadgeText);
  }, [globalBadgeText]);

  useEffect(() => {
    if (globalBadgeCount <= 0 || prevGlobalBadgeCount > 0) {
      return;
    }

    app.dock.bounce();
  }, [globalBadgeCount, prevGlobalBadgeCount]);

  return null;
};

export default Dock;
