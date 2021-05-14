import { app } from 'electron';

import {
  selectGlobalBadgeText,
  selectGlobalBadgeCount,
} from '../common/badgeSelectors';
import { Service } from '../common/store';

class DockService extends Service {
  protected initialize(): void {
    if (process.platform !== 'darwin') {
      return;
    }

    this.watch(selectGlobalBadgeText, (globalBadgeText) => {
      app.dock.setBadge(globalBadgeText);
    });

    this.watch(
      selectGlobalBadgeCount,
      (globalBadgeCount, prevGlobalBadgeCount) => {
        if (globalBadgeCount <= 0 || (prevGlobalBadgeCount ?? 0) > 0) {
          return;
        }

        app.dock.bounce();
      }
    );
  }
}

export default new DockService();
