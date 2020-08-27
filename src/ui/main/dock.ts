import { app } from 'electron';

import { selectGlobalBadgeText, selectGlobalBadgeCount } from '../../selectors';
import { watch } from '../../store';

const setBadge = (globalBadgeText: string): void => {
  app.dock.setBadge(globalBadgeText);
};

const bounce = (): void => {
  app.dock.bounce();
};

export const setupDock = (): void => {
  if (process.platform !== 'darwin') {
    return;
  }

  watch(selectGlobalBadgeText, (globalBadgeText) => {
    setBadge(globalBadgeText);
  });

  watch(selectGlobalBadgeCount, (globalBadgeCount, prevGlobalBadgeCount) => {
    if (globalBadgeCount <= 0 || prevGlobalBadgeCount > 0) {
      return;
    }

    bounce();
  });
};
